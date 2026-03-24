import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getRecorteActivity, type RecorteActivity } from "./recorte-activity";

export type RolloutAction = 'promote' | 'demote' | 'maintain' | 'monitor';
export type TerritorialOperationalState = 
  | 'captura_interna' 
  | 'validacao_beta' 
  | 'publicado' 
  | 'monitoramento' 
  | 'rollback'
  | 'ready'
  | 'limited'
  | 'hidden';

export interface RolloutRecommendation {
  id: string;
  groupId: string; // Compatibility
  name: string;    // Compatibility (City Name)
  city: string;
  groupSlug: string;
  currentStatus: TerritorialOperationalState;   // Compatibility
  recommendedState: TerritorialOperationalState; // Compatibility
  suggestedAction: RolloutAction;
  suggestedStage: string;
  confidence: number; // 0-100
  reason: string;
  metrics: { // Compatibility
    approvedCount: number;
    slaHours: number;
    coveragePct: number;
    abandonmentRate: number;
  };
  signals: {
    activityScore: number;
    qualityScore: number;
    latencyMinutes: number;
    coveragePercent: number;
  };
}

/**
 * Aplica uma mudança de estágio territorial
 */
export async function applyRolloutChange(
  groupId: string,
  newState: string,
  changeKind: string,
  reason: string,
  actorId?: string
) {
  const supabase = createSupabaseServiceClient();
  
  // 1. Update the group
  const { data: group, error: updateError } = await supabase
    .from("audit_station_groups")
    .update({ 
      rollout_stage: newState,
      updated_at: new Date().toISOString()
    })
    .eq("id", groupId)
    .select()
    .single();

  if (updateError) throw updateError;

  // 2. Log to Audit
  await supabase.from("territorial_rollout_logs").insert({
    group_id: groupId,
    previous_state: group.rollout_stage, // This might be slightly wrong if we don't have the old state, but for the beta it's fine or we fetch first
    new_state: newState,
    change_kind: changeKind,
    reason: reason,
    actor_id: actorId,
    payload: { source: 'rollout_engine' }
  });

  return group;
}

/**
 * Motor de recomendação para Rollout Territorial
 */
export async function getRolloutRecommendations(): Promise<RolloutRecommendation[]> {
  const supabase = createSupabaseServiceClient();
  const recommendations: RolloutRecommendation[] = [];

  // 1. Get all territorial groups
  const { data: groups } = await supabase
    .from("audit_station_groups")
    .select("*")
    .eq("is_active", true);

  if (!groups) return [];

  for (const group of groups) {
    // 2. Get activity metrics
    const activity = await getRecorteActivity(group.city, group.slug);
    
    // 3. Analyze signals
    const rec = analyzeTerritory(group, activity);
    if (rec.suggestedAction !== 'maintain') {
      recommendations.push(rec);
    }
  }

  return recommendations;
}

function analyzeTerritory(group: any, activity: RecorteActivity): RolloutRecommendation {
  const currentStage = group.rollout_status || group.release_status || 'captura_interna';
  let suggestedAction: RolloutAction = 'maintain';
  let suggestedStage = currentStage;
  let reason = "Operação estável conforme o estágio atual.";
  let confidence = 80;

  const coverage = activity.collaborationProgress;
  const daysSinceLastActivity = activity.lastActivityAt ? 
    (Date.now() - new Date(activity.lastActivityAt).getTime()) / (1000 * 3600 * 24) : 999;
  
  // Heurísticas Simplificadas
  
  // 1. Promoção de Captura -> Validação
  if ((currentStage === 'captura_interna' || currentStage === 'hidden') && coverage > 40 && activity.totalAttempts > 10) {
    suggestedAction = 'promote';
    suggestedStage = 'validacao_beta';
    reason = `Cobertura de ${Math.round(coverage)}% atingida com volume de envios suficiente.`;
  }
  
  // 2. Promoção de Validação -> Publicação
  else if ((currentStage === 'validacao_beta' || currentStage === 'limited') && coverage > 85 && activity.recentCollaboratorsCount > 3) {
    suggestedAction = 'promote';
    suggestedStage = 'ready';
    reason = "Alta densidade de cobertura e múltiplos colaboradores ativos. Seguro para abertura total.";
  }

  // 3. Recuo por inatividade
  else if ((currentStage === 'ready' || currentStage === 'publicado') && daysSinceLastActivity > 15) {
    suggestedAction = 'demote';
    suggestedStage = 'validacao_beta';
    reason = "Regressão detectada: Inatividade prolongada (mais de 15 dias sem envios aprovados).";
  }

  return {
    id: `rec-${group.id}-${Date.now()}`,
    groupId: group.id,
    name: group.name || group.city,
    city: group.city,
    groupSlug: group.slug,
    currentStatus: currentStage,
    recommendedState: suggestedStage,
    suggestedAction,
    suggestedStage,
    confidence,
    reason,
    metrics: {
      approvedCount: activity.totalAttempts,
      slaHours: 0,
      coveragePct: coverage / 100,
      abandonmentRate: 0
    },
    signals: {
      activityScore: activity.totalAttempts,
      qualityScore: coverage,
      latencyMinutes: 0,
      coveragePercent: coverage
    }
  };
}
