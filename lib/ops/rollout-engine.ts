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
    const members = await getAuditGroupMembers(group.id);
    const stationIds = members.map(m => m.stationId);
    if (stationIds.length === 0) continue;

    // 1. SINAL: Volume de Envios Aprovados
    const { data: recentApproved } = await supabase
      .from("price_reports")
      .select("id, approved_at, reported_at, status")
      .in("station_id", stationIds)
      .eq("status", "approved")
      .gte("reported_at", weekAgo.toISOString());

    const approvedCount = recentApproved?.length || 0;

    // 2. SINAL: Latência de Moderação (SLA)
    let avgSla = 0;
    if (recentApproved && recentApproved.length > 0) {
       const durations = recentApproved
         .filter(r => r.approved_at)
         .map(r => new Date(r.approved_at!).getTime() - new Date(r.reported_at).getTime());
       if (durations.length > 0) {
         avgSla = durations.reduce((a, b) => a + b, 0) / durations.length / (1000 * 60 * 60);
       }
    }

    // 3. SINAL: Abandono Operacional (Funnel)
    const { data: events } = await supabase
      .from("operational_events")
      .select("event_type")
      .eq("scope_id", group.slug)
      .gte("created_at", weekAgo.toISOString());

    const cameraOpens = events?.filter(e => e.event_type === "submission_camera_opened").length || 0;
    const successes = events?.filter(e => e.event_type === "submission_success" || e.event_type === "submission_accepted").length || 0;
    const abandonmentRate = cameraOpens > 0 ? (cameraOpens - successes) / cameraOpens : 0;

    // 4. SINAL: Conflitos de Qualidade
    // Eventos que indicam que um envio foi sinalizado ou teve problemas detectados mecanicamente
    const qualityFlags = events?.filter(e => e.event_type === "submission_quality_flagged" || e.event_type === "submission_blocked").length || 0;
    const qualityConflictRate = approvedCount > 0 ? qualityFlags / (approvedCount + qualityFlags) : 0;

    // 5. SINAL: Prova de Vida (Atividade de Navegação)
    const proofOfLife = events?.filter(e => e.event_type === "hub_opened" || e.event_type === "station_clicked").length || 0;

    // 6. SINAL: Cobertura Territorial
    const { data: coverageData } = await supabase
      .from("price_reports")
      .select("station_id")
      .in("station_id", stationIds)
      .eq("status", "approved")
      .gte("reported_at", twoDaysAgo.toISOString());
    
    const uniqueStations = new Set(coverageData?.map(d => d.station_id) || []).size;
    const coveragePct = stationIds.length > 0 ? (uniqueStations / stationIds.length) : 0;

    const metrics = { 
      approvedCount, 
      abandonmentRate, 
      slaHours: avgSla, 
      coveragePct,
      qualityConflictRate,
      proofOfLife
    };

    // 7. Lógica de Scoring para Recomendação
    let suggestion: AuditStationGroup["releaseStatus"] | null = null;
    let reason = "";
    let confidence = 0.5;

    // Regras de Promoção (Upgrade de Estágio)
    const isStable = abandonmentRate < 0.35 && qualityConflictRate < 0.15 && avgSla < 12;
    const isHighActivity = approvedCount >= 20 && coveragePct > 0.4;
    const isMaturity = approvedCount >= 40 && coveragePct > 0.7 && avgSla < 4;

    if (group.releaseStatus === "hidden" && approvedCount >= 5 && proofOfLife > 10) {
      suggestion = "limited";
      reason = "Atividade inicial e interesse detectados. Iniciar teste limitado.";
      confidence = 0.6;
    } else if (group.releaseStatus === "limited" && isHighActivity && isStable) {
      suggestion = "validating";
      reason = "Volume robusto e estabilidade de dados. Pronto para Beta Público.";
      confidence = 0.8;
    } else if (group.releaseStatus === "validating" && isMaturity && isStable) {
      suggestion = "ready";
      reason = "Consolidação atingida. Alta cobertura e baixa latência.";
      confidence = 0.9;
    }

    // Regras de Recuo (Downgrade de Estágio / Rollback)
    const isDegrading = abandonmentRate > 0.6 || qualityConflictRate > 0.25;
    const isGhostArea = proofOfLife < 5 && approvedCount < 2 && group.releaseStatus !== "hidden";

    if (group.releaseStatus === "ready" && (isDegrading || approvedCount < 10)) {
      suggestion = "validating";
      reason = "Alerta de regressão: queda de atividade ou alta taxa de abandono.";
      confidence = 0.85;
    } else if (isGhostArea) {
      suggestion = "limited";
      reason = "Abandono crítico ou falta de prova de vida no território.";
      confidence = 0.7;
    }

    // Persistência da Recomendação
    if (suggestion && suggestion !== group.releaseStatus) {
      recommendations.push({
        groupId: group.id,
        slug: group.slug,
        name: group.name,
        currentStatus: group.releaseStatus,
        recommendedState: suggestion,
        reason,
        confidence,
        metrics: {
          approvedCount,
          abandonmentRate,
          slaHours: avgSla,
          coveragePct
        }
      });

      await supabase
        .from("audit_station_groups")
        .update({ 
          recommended_state: suggestion,
          rollout_notes: `[MOTOR] ${reason} | Confiança: ${Math.round(confidence * 100)}% | Sinais: ${approvedCount} apr, ${Math.round(coveragePct * 100)}% cov, ${Math.round(abandonmentRate * 100)}% abnd`
        })
        .eq("slug", group.slug);
    } else if (group.recommendedState && group.recommendedState === group.releaseStatus) {
       await supabase
        .from("audit_station_groups")
        .update({ recommended_state: null })
        .eq("slug", group.slug);
    }
  }

  return recommendations;
}
