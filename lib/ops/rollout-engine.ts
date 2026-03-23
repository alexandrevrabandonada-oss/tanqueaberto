import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getAuditGroups } from "@/lib/audit/groups";

export type TerritorialOperationalState = 'closed' | 'limited_test' | 'beta_open' | 'monitoring' | 'rollback';

export interface RolloutRecommendation {
  groupId: string;
  name: string;
  currentState: TerritorialOperationalState;
  recommendedState: TerritorialOperationalState;
  reason: string;
  metrics: {
    submissions7d: number;
    approvals7d: number;
    abandonmentRatio: number;
    errorRate: number;
  };
}

export async function getRolloutRecommendations(): Promise<RolloutRecommendation[]> {
  const supabase = createSupabaseServiceClient();
  const auditGroups = await getAuditGroups();
  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const recommendations: RolloutRecommendation[] = [];

  for (const group of auditGroups) {
    // 1. Fetch metrics for this group
    const { data: events } = await supabase
      .from("operational_events")
      .select("event_type")
      .eq("scope_id", group.slug)
      .gte("created_at", last7d);

    const { data: reports } = await supabase
      .from("price_reports")
      .select("status")
      .eq("group_id", group.id) // Assuming we have group_id link, or use city/slug
      .gte("created_at", last7d);

    const cameraOpens = events?.filter(e => e.event_type === "submission_camera_opened").length || 0;
    const successes = events?.filter(e => e.event_type === "submission_success" || e.event_type === "price_report_submitted").length || 0;
    const approvals = reports?.filter(r => r.status === "approved").length || 0;
    const rejections = reports?.filter(r => r.status === "rejected").length || 0;

    const abandonmentRatio = cameraOpens / (successes || 1);
    const errorRate = rejections / ((approvals + rejections) || 1);
    const currentState = (group as any).operationalState || 'closed';

    let recommendedState = currentState;
    let reason = "Manter estado atual.";

    // 2. Promotion Logic (limited_test -> beta_open)
    if (currentState === 'limited_test' || currentState === 'closed') {
      if (approvals >= 15 && errorRate < 0.15 && abandonmentRatio < 2.5) {
        recommendedState = 'beta_open';
        reason = "Volume e qualidade validados. Pronto para beta aberto.";
      } else if (cameraOpens > 10 && currentState === 'closed') {
         recommendedState = 'limited_test';
         reason = "Interesse detectado. Abrir para teste limitado.";
      }
    }

    // 3. Status Check (beta_open -> monitoring/rollback)
    if (currentState === 'beta_open' || currentState === 'monitoring') {
      if (abandonmentRatio > 6 || errorRate > 0.4) {
        recommendedState = 'rollback';
        reason = "Degradação crítica de performance ou qualidade. Sugerido recuo.";
      } else if (abandonmentRatio > 4 || errorRate > 0.25) {
        recommendedState = 'monitoring';
        reason = "Sinais de atrito acima da média. Requer monitoramento intensivo.";
      } else if (currentState === 'monitoring' && abandonmentRatio < 3 && errorRate < 0.1) {
        recommendedState = 'beta_open';
        reason = "Estabilidade recuperada. Voltar para beta aberto normal.";
      }
    }

    if (recommendedState !== currentState) {
      recommendations.push({
        groupId: group.id,
        name: group.name,
        currentState,
        recommendedState,
        reason,
        metrics: {
          submissions7d: successes,
          approvals7d: approvals,
          abandonmentRatio,
          errorRate
        }
      });
    }
  }

  return recommendations;
}

export async function applyRolloutChange(
  groupId: string, 
  newState: TerritorialOperationalState, 
  changeKind: 'automated' | 'manual_override',
  reason: string,
  actorId?: string
) {
  const supabase = createSupabaseServiceClient();
  
  // 1. Get current state
  const { data: group } = await supabase
    .from("audit_station_groups")
    .select("operational_state")
    .eq("id", groupId)
    .single();

  const previousState = group?.operational_state || 'closed';

  // 2. Update group
  const { error: updateError } = await supabase
    .from("audit_station_groups")
    .update({ 
      operational_state: newState,
      recommended_state: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", groupId);

  if (updateError) throw updateError;

  // 3. Log change
  await supabase.from("territorial_rollout_logs").insert({
    group_id: groupId,
    previous_state: previousState,
    new_state: newState,
    change_kind: changeKind,
    reason,
    actor_id: actorId
  });
}
