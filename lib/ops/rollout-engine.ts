import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getAuditGroups, getAuditGroupMembers } from "@/lib/audit/groups";
import { type AuditStationGroup } from "@/lib/audit/types";

export type TerritorialOperationalState = AuditStationGroup["releaseStatus"];

export interface RolloutRecommendation {
  groupId: string;
  slug: string;
  name: string;
  currentStatus: TerritorialOperationalState;
  recommendedState: TerritorialOperationalState;
  reason: string;
  confidence: number;
  metrics: {
    approvedCount: number;
    abandonmentRate: number;
    slaHours: number;
    coveragePct: number;
  };
}

export async function applyRolloutChange(
  groupId: string,
  newState: TerritorialOperationalState,
  kind: 'automated' | 'manual_override',
  reason: string,
  adminId: string
) {
  const supabase = createSupabaseServiceClient();
  
  // 1. Update the actual group status
  const { error: updateError } = await supabase
    .from("audit_station_groups")
    .update({ 
      release_status: newState,
      recommended_state: null, // Clear recommendation
      rollout_notes: `${kind === 'automated' ? '[AUTO]' : '[MANUAL]'} ${reason}`
    })
    .eq("id", groupId);

  if (updateError) throw updateError;

  // 2. Log the operation
  await supabase
    .from("operational_logs")
    .insert({
      event_type: "rollout_change",
      scope_type: "audit_group",
      scope_id: groupId,
      severity: "info",
      message: `Rollout change to ${newState}: ${reason}`,
      metadata: { kind, adminId },
      created_at: new Date().toISOString()
    });
}

export const getRolloutRecommendations = generateGroupRecommendations;

export async function generateGroupRecommendations(): Promise<RolloutRecommendation[]> {
  const supabase = createSupabaseServiceClient();
  const groups = await getAuditGroups();
  const recommendations: RolloutRecommendation[] = [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  for (const group of groups) {
    // 1. Fetch Metrics for this group
    // In a real scenario, we'd have a more efficient way to query this per group.
    // For the beta, we'll use the group members to filter.
    const members = await getAuditGroupMembers(group.id);
    const stationIds = members.map(m => m.stationId);

    if (stationIds.length === 0) continue;

    // Approved reports in the last 7 days
    const { data: recentApproved } = await supabase
      .from("price_reports")
      .select("id, approved_at, reported_at")
      .in("station_id", stationIds)
      .eq("status", "approved")
      .gte("reported_at", weekAgo.toISOString());

    const approvedCount = recentApproved?.length || 0;

    // SLA: Average time between reported_at and approved_at
    let avgSla = 0;
    if (recentApproved && recentApproved.length > 0) {
       const durations = recentApproved
         .filter(r => r.approved_at)
         .map(r => new Date(r.approved_at!).getTime() - new Date(r.reported_at).getTime());
       if (durations.length > 0) {
         avgSla = durations.reduce((a, b) => a + b, 0) / durations.length / (1000 * 60 * 60);
       }
    }

    // Abandonment: camera_opened vs submission_success in this group
    const { data: events } = await supabase
      .from("operational_events")
      .select("event_type")
      .eq("scope_id", group.slug)
      .gte("created_at", weekAgo.toISOString());

    const cameraOpens = events?.filter(e => e.event_type === "submission_camera_opened").length || 0;
    const successes = events?.filter(e => e.event_type === "submission_success").length || 0;
    const abandonmentRate = cameraOpens > 0 ? (cameraOpens - successes) / cameraOpens : 0;

    // Coverage: Unique stations with reports vs total stations in group
    const { data: coverageData } = await supabase
      .from("price_reports")
      .select("station_id")
      .in("station_id", stationIds)
      .eq("status", "approved")
      .gte("reported_at", twoDaysAgo.toISOString());
    
    const uniqueStations = new Set(coverageData?.map(d => d.station_id) || []).size;
    const coveragePct = stationIds.length > 0 ? (uniqueStations / stationIds.length) : 0;

    const metrics = { approvedCount, abandonmentRate, slaHours: avgSla, coveragePct };

    // 2. Logic Rules
    let suggestion: AuditStationGroup["releaseStatus"] | null = null;
    let reason = "";

    // PROMOCAO
    if (group.releaseStatus === "hidden" && approvedCount >= 5 && coveragePct > 0.2) {
      suggestion = "limited";
      reason = "Atividade inicial detectada. Pronto para teste limitado.";
    } else if (group.releaseStatus === "limited" && approvedCount >= 15 && coveragePct > 0.5 && avgSla < 12) {
      suggestion = "validating";
      reason = "Boa cobertura e SLA estável. Pronto para validação pública.";
    } else if (group.releaseStatus === "validating" && approvedCount >= 30 && coveragePct > 0.7 && avgSla < 4) {
      suggestion = "ready";
      reason = "Massa crítica atingida e SLA de performance excelente.";
    }

    // RECUO
    if (group.releaseStatus === "ready" && (abandonmentRate > 0.6 || (approvedCount < 5 && now.getTime() - twoDaysAgo.getTime() > 0))) {
        // Se abandonment rate for muito alto no READY, sugere recuo
        suggestion = "validating";
        reason = "Regressão de UX ou queda brusca de atividade no grupo.";
    }

    if (suggestion && suggestion !== group.releaseStatus) {
      recommendations.push({
        groupId: group.id,
        slug: group.slug,
        name: group.name,
        currentStatus: group.releaseStatus,
        recommendedState: suggestion,
        reason,
        confidence: 0.8,
        metrics
      });

      // Persist recommendation to DB for the UI to show
      await supabase
        .from("audit_station_groups")
        .update({ 
          recommended_state: suggestion,
          rollout_notes: `Sugestão do Motor: ${reason} (Metrics: ${Math.round(coveragePct * 100)}% cov, ${approvedCount} reports)`
        })
        .eq("slug", group.slug);
    } else if (group.recommendedState) {
       // Clear if metrics no longer justify it (or if it was already updated)
       if (group.recommendedState === group.releaseStatus) {
         await supabase
          .from("audit_station_groups")
          .update({ recommended_state: null })
          .eq("slug", group.slug);
       }
    }
  }

  return recommendations;
}
