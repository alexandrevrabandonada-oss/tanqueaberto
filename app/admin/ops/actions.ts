"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { updateKillSwitch, type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { getAuditGroupBySlug } from "@/lib/audit/groups";
import { recordOperationalEvent } from "@/lib/ops/logs";

export async function toggleKillSwitchAction(key: keyof OperationalKillSwitches, value: boolean) {
  const result = await updateKillSwitch(key, value, "admin_dashboard");
  if (result) {
    revalidatePath("/admin/ops");
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

import { generateGroupRecommendations } from "@/lib/ops/rollout-engine";

export async function triggerRolloutEngineAction() {
  await generateGroupRecommendations();
  revalidatePath("/admin/ops");
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
