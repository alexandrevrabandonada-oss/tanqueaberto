"use client"; // Wait, actions should be server-side. Removing "use client".
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { updateKillSwitch, type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { getAuditGroupBySlug } from "@/lib/audit/groups";

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
