"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { calculateBetaReadiness, type ReadinessResult } from "@/lib/ops/readiness-engine";
import { updateKillSwitch, getKillSwitches, type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { getAuditGroupBySlug } from "@/lib/audit/groups";
import { recordOperationalEvent } from "@/lib/ops/logs";
import { type SystemHealthSignal, type CommandCenterState } from "@/lib/ops/command-center-types";
import { getRolloutRecommendations } from "@/lib/ops/rollout-engine";
import { getActiveActionableAlerts } from "@/lib/ops/alerts";
import { getRecorteActivity } from "@/lib/ops/recorte-activity";
import { generateOperationalSynthesis, type OperationalSynthesis } from "@/lib/ops/feedback-analyzer";
import { type OperationalActionType } from "@/lib/ops/feedback-clustering";
import { calculateCycleLatencyMetrics, type CycleLatencyMetrics } from "@/lib/ops/cycle-latency";

export async function toggleKillSwitchAction(key: keyof OperationalKillSwitches, value: boolean) {
  const result = await updateKillSwitch(key, value, "admin_dashboard");
  if (result) {
    await recordOperationalEvent({
      eventType: "kill_switch_change",
      scopeType: "system",
      reason: `Kill Switch ${key} ${value ? 'ativado' : 'desativado'} via Command Center`,
      payload: { key, value }
    });
    revalidatePath("/admin/ops");
    revalidatePath("/admin/command-center");
    revalidatePath("/");
  }
  return result;
}

export async function updateGroupRolloutAction(
  slug: string, 
  updates: { 
    releaseStatus?: "ready" | "validating" | "limited" | "hidden";
    operationalState?: 'closed' | 'limited_test' | 'beta_open' | 'monitoring' | 'rollback';
    isPublished?: boolean;
    rolloutNotes?: string;
  }
) {
  const supabase = createSupabaseServiceClient();
  const group = await getAuditGroupBySlug(slug);
  
  if (!group) return { success: false, error: "Group not found" };

  const { error } = await supabase
    .from("audit_station_groups")
    .update({
      release_status: updates.releaseStatus ?? group.releaseStatus,
      operational_state: updates.operationalState ?? group.operationalState,
      is_published: updates.isPublished ?? group.isPublished,
      rollout_notes: updates.rolloutNotes ?? group.rolloutNotes,
      updated_at: new Date().toISOString()
    })
    .eq("slug", slug);

  if (error) {
    console.error("Failed to update group rollout", error);
    return { success: false, error: error.message };
  }

  // Log change
  await supabase.from("operational_logs").insert({
    event_kind: "territorial_rollout_change",
    message: `Alteração no recorte ${group.name}: ${JSON.stringify(updates)}`,
    payload: { slug, updates, previous: group },
    actor_id: "admin_dashboard"
  });

  // Log to structured history if status changed
  if (updates.releaseStatus && updates.releaseStatus !== group.releaseStatus) {
    await supabase.from("territorial_rollout_logs").insert({
      group_id: group.id,
      previous_state: group.releaseStatus,
      new_state: updates.releaseStatus,
      change_kind: 'manual_override',
      reason: updates.rolloutNotes || "Alteração manual direta",
      payload: { updates }
    });

    await recordOperationalEvent({
      eventType: "rollout_manual_override",
      scopeType: "territory",
      scopeId: slug,
      reason: updates.rolloutNotes,
      payload: { from: group.releaseStatus, to: updates.releaseStatus }
    });
  }

  revalidatePath("/admin/ops");
  revalidatePath("/admin/command-center");
  revalidatePath("/");
  return { success: true };
}

export async function getOperationalHistory(limit = 20) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("operational_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch operational history", error);
    return [];
  }

  return data;
}

export async function acceptRolloutRecommendationAction(slug: string, suggestedStatus: string, reason?: string) {
  const supabase = createSupabaseServiceClient();
  const group = await getAuditGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found" };

  const { error } = await supabase
    .from("audit_station_groups")
    .update({ 
      release_status: suggestedStatus,
      recommended_state: null,
      updated_at: new Date().toISOString()
    })
    .eq("slug", slug);

  if (error) return { success: false, error: error.message };

  await supabase.from("territorial_rollout_logs").insert({
    group_id: group.id,
    previous_state: group.releaseStatus,
    new_state: suggestedStatus,
    change_kind: 'manual_override',
    reason: reason || "Sugestão aceita pelo administrador",
    actor_id: null,
    payload: { action: "accept_recommendation", metrics_snapshot: group.rolloutNotes }
  });

  await recordOperationalEvent({
    eventType: "rollout_recommendation_accepted",
    scopeType: "territory",
    scopeId: slug,
    reason: reason,
    payload: { from: group.releaseStatus, to: suggestedStatus }
  });

  revalidatePath("/admin/ops");
  return { success: true };
}

export async function rejectRolloutRecommendationAction(slug: string, reason?: string) {
  const supabase = createSupabaseServiceClient();
  const group = await getAuditGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found" };

  const { error } = await supabase
    .from("audit_station_groups")
    .update({ 
      recommended_state: null,
      updated_at: new Date().toISOString()
    })
    .eq("slug", slug);

  if (error) return { success: false, error: error.message };

  await supabase.from("territorial_rollout_logs").insert({
    group_id: group.id,
    previous_state: group.releaseStatus,
    new_state: group.releaseStatus,
    change_kind: 'manual_override',
    reason: reason || "Sugestão rejeitada pelo administrador",
    actor_id: null,
    payload: { action: "reject_recommendation" }
  });

  await recordOperationalEvent({
    eventType: "rollout_recommendation_rejected",
    scopeType: "territory",
    scopeId: slug,
    reason: reason,
    payload: { status: group.releaseStatus }
  });

  revalidatePath("/admin/ops");
  return { success: true };
}

export async function triggerRolloutEngineAction() {
  // O motor agora roda sob demanda no getCommandCenterState
  revalidatePath("/admin/command-center");
  return { success: true };
}

export async function updateBetaFeedbackTriageAction(formData: FormData): Promise<void> {
  const id = formData.get("feedbackId") as string;
  const status = formData.get("triageStatus") as string;
  const triageNotes = (formData.get("triageNotes") as string) || "";

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("beta_feedback")
    .update({ 
      status: status,
      triage_notes: triageNotes,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  revalidatePath("/admin/ops");
}

export async function createBetaInviteAction(formData: FormData): Promise<void> {
  const code = formData.get("code") as string;
  const maxUses = parseInt(formData.get("maxUses") as string || "1");
  const expiresAt = formData.get("expiresAt") as string;
  const batchLabel = formData.get("batchLabel") as string;
  const batchNote = formData.get("batchNote") as string;
  const testerNote = formData.get("testerNote") as string;

  const supabase = createSupabaseServiceClient();
  
  const generatedCode = code || Math.random().toString(36).substring(2, 10).toUpperCase();

  await supabase
    .from("beta_invites")
    .insert({
      code: generatedCode,
      max_uses: maxUses,
      expires_at: expiresAt || null,
      batch_label: batchLabel,
      batch_note: batchNote,
      tester_note: testerNote,
      is_active: true
    });

  revalidatePath("/admin/ops");
}

export async function disableBetaInviteAction(formData: FormData): Promise<void> {
  const inviteId = formData.get("inviteId") as string;
  const supabase = createSupabaseServiceClient();

  await supabase
    .from("beta_invites")
    .update({ is_active: false })
    .eq("id", inviteId);

  revalidatePath("/admin/ops");
}

export async function getTerritorialRolloutHistory(limit = 20) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("territorial_rollout_logs")
    .select("*, audit_station_groups(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch territorial rollout history", error);
    return [];
  }

  return data as any[];
}

export async function getCommandCenterHistory(limit = 30) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("operational_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch command center history", error);
    return [];
  }

  return data;
}

export async function getCommandCenterState(): Promise<CommandCenterState> {
  const supabase = createSupabaseServiceClient();
  
  // 1. Fetch system signals (Heuristics for now)
  const healthSignals: SystemHealthSignal[] = [
    { id: 'api', label: 'API Gateway', status: 'healthy', value: '124ms', lastUpdated: new Date().toISOString() },
    { id: 'db', label: 'Database', status: 'healthy', value: '4% CPU', lastUpdated: new Date().toISOString() },
    { id: 'upload', label: 'Media Upload', status: 'healthy', value: '99.8%', lastUpdated: new Date().toISOString() },
  ];

  const [
    activeAlerts,
    killSwitches,
    territorialRecommendations,
    synthesis
  ] = await Promise.all([
    getActiveActionableAlerts(),
    getKillSwitches(),
    getRolloutRecommendations(),
    getOperationalSynthesisAction()
  ]);

  const { count: moderationCount } = await supabase
    .from("price_reports")
    .select("id", { count: 'exact', head: true })
    .eq("status", "pending");

  return {
    healthSignals,
    activeAlerts,
    killSwitches,
    moderationQueueCount: moderationCount || 0,
    territorialRecommendations,
    synthesis
  };
}

/**
 * Processa o aceite ou rejeição de uma sugestão do motor de rollout
 */
export async function processRolloutRecommendationAction(
  recommendationId: string,
  slug: string,
  action: 'accept' | 'reject',
  notes: string,
  targetStage?: string
) {
  const supabase = createSupabaseServiceClient();
  const group = await getAuditGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found" };

  // 1. Log Decision
  await supabase.from("territorial_rollout_logs").insert({
    group_id: group.id,
    previous_state: group.releaseStatus,
    new_state: action === 'accept' ? targetStage : group.releaseStatus,
    change_kind: action === 'accept' ? 'system_recommendation' : 'manual_override',
    reason: notes || (action === 'accept' ? "Sugestão aceita" : "Sugestão rejeitada"),
    payload: { recommendationId, action, notes }
  });

  // 2. Apply if accepted
  if (action === 'accept' && targetStage) {
    await supabase
      .from("audit_station_groups")
      .update({ release_status: targetStage, updated_at: new Date().toISOString() })
      .eq("slug", slug);
      
    await recordOperationalEvent({
      eventType: "rollout_recommendation_accepted",
      scopeType: "territory",
      scopeId: slug,
      reason: notes,
      payload: { targetStage }
    });
  } else {
    await recordOperationalEvent({
      eventType: "rollout_recommendation_rejected",
      scopeType: "territory",
      scopeId: slug,
      reason: notes,
      payload: { currentStage: group.releaseStatus }
    });
  }

  revalidatePath("/admin/command-center");
  revalidatePath("/admin/ops");
  return { success: true };
}

export async function getOperationalSynthesisAction(): Promise<OperationalSynthesis> {
  const supabase = createSupabaseServiceClient();
  
  // Get recent feedback
  const { data: feedback } = await supabase
    .from('beta_feedback_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  // Get general activity (summary for focus)
  const activity = await getRecorteActivity("all");

  return generateOperationalSynthesis(feedback || [], activity);
}

export async function executeOperationalAction(
  type: OperationalActionType,
  params: Record<string, any>,
  reason: string
) {
  const supabase = createSupabaseServiceClient();
  
  try {
    switch (type) {
      case 'REVISE_STATION':
        if (!params.stationId) return { success: false, error: "Missing stationId" };
        await supabase
          .from("stations")
          .update({ 
            visibility_status: 'review_required',
            curation_note: `Revisão solicitada via Voz da Rua: ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq("id", params.stationId);
        break;

      case 'HOLD_ROLLOUT':
        if (!params.groupSlug) return { success: false, error: "Missing groupSlug" };
        const group = await getAuditGroupBySlug(params.groupSlug);
        if (group) {
          await supabase
            .from("audit_station_groups")
            .update({ 
              release_status: 'limited',
              operational_state: 'rollback',
              rollout_notes: `Rollback preventivo via Voz da Rua: ${reason}`,
              updated_at: new Date().toISOString()
            })
            .eq("slug", params.groupSlug);
          
          await supabase.from("territorial_rollout_logs").insert({
            group_id: group.id,
            previous_state: group.releaseStatus,
            new_state: 'limited',
            change_kind: 'system_recommendation',
            reason: `Aceite de cluster Voz da Rua: ${reason}`,
            payload: { type, params }
          });
        }
        break;

      case 'ADJUST_RADIUS':
        // Mocking for now as we don't have a global config table exposed here, 
        // but we record the event for engineering.
        await recordOperationalEvent({
          eventType: "system_config_recommendation",
          scopeType: "system",
          reason: `Ajuste de raio sugerido para ${params.city}: ${reason}`,
          payload: { type, params }
        });
        break;

      case 'NOTIFY_TEAM':
        await recordOperationalEvent({
          eventType: "operational_alert_escalated",
          scopeType: "system",
          reason: `Escalação via Voz da Rua: ${reason}`,
          payload: { type, params }
        });
        break;
        
      default:
        return { success: false, error: "Unsupported action type" };
    }

    await recordOperationalEvent({
      eventType: "operational_action_executed",
      scopeType: "system",
      reason: `Ação ${type} executada via Voz da Rua: ${reason}`,
      payload: { type, params }
    });

    revalidatePath("/admin/ops");
    revalidatePath("/admin/command-center");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to execute operational action", error);
    return { success: false, error: error.message };
  }
}

export async function getCycleLatencyMetricsAction(): Promise<CycleLatencyMetrics> {
  return calculateCycleLatencyMetrics();
}

export async function submitQuickFeedbackAction(data: {
  feedbackType: string;
  message: string;
  pagePath: string;
  city?: string;
  testerNickname?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = createSupabaseServiceClient();
  
  const { error } = await supabase
    .from("beta_feedback_submissions")
    .insert({
      feedback_type: data.feedbackType,
      message: data.message,
      page_path: data.pagePath,
      city: data.city || null,
      tester_nickname: data.testerNickname || null,
      status: 'pending',
      screen_group: 'session_debrief',
      triage_priority: data.feedbackType === 'fluid' ? 'baixa' : 'media',
      payload: { 
        sessionId: data.sessionId,
        ...data.metadata 
      }
    });

  if (error) {
    console.error("Failed to submit quick feedback", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateCollectorCohortAction(nickname: string, ipHash: string, newCohort: string, reason?: string) {
  const supabase = createSupabaseServiceClient();
  
  // Get old cohort for logging
  const { data: current } = await supabase
    .from('collector_trust')
    .select('cohort')
    .eq('nickname', nickname)
    .eq('ip_hash', ipHash)
    .single();

  const { error } = await supabase
    .from('collector_trust')
    .update({ 
      cohort: newCohort,
      updated_at: new Date().toISOString()
    })
    .eq('nickname', nickname)
    .eq('ip_hash', ipHash);

  if (error) return { success: false, error: error.message };

  // Log change
  await supabase
    .from('cohort_change_log')
    .insert({
      nickname,
      ip_hash: ipHash,
      old_cohort: current?.cohort,
      new_cohort: newCohort,
      reason: reason || 'Manual admin override',
      actor_id: 'admin'
    });

  revalidatePath("/admin/ops");
  return { success: true };
}

export async function getCohortMetricsAction() {
  const supabase = createSupabaseServiceClient();
  
  // Fetch aggregations per cohort
  const { data, error } = await supabase
    .from('collector_trust')
    .select('cohort, total_reports, approved_reports, rejected_reports, score');

  if (error) return [];

  const cohorts = Array.from(new Set(data.map(d => d.cohort)));
  
  return cohorts.map(c => {
    const members = data.filter(d => d.cohort === c);
    const totalReports = members.reduce((acc, m) => acc + m.total_reports, 0);
    const approved = members.reduce((acc, m) => acc + m.approved_reports, 0);
    const avgScore = Math.round(members.reduce((acc, m) => acc + m.score, 0) / members.length);
    const aprRate = totalReports > 0 ? Math.round((approved / totalReports) * 100) : 0;

    return {
      id: c,
      label: c,
      memberCount: members.length,
      totalReports,
      aprRate,
      avgScore
    };
  });
}

export async function getBetaReadinessAction(): Promise<ReadinessResult> {
  return await calculateBetaReadiness();
}

export async function saveDecisionSnapshotAction(result: ReadinessResult) {
  const supabase = createSupabaseServiceClient();
  
  const { error } = await supabase
    .from('beta_decision_snapshots')
    .insert({
      readiness_score: result.score,
      status: result.status,
      metrics: result.metrics,
      risks: result.risks,
      recommendation: result.recommendation
    });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/ops");
  return { success: true };
}

export async function getDecisionHistoryAction() {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('beta_decision_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return data || [];
}
