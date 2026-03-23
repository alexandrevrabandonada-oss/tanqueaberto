import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditStationGroup, AuditStationGroupMember } from "@/lib/audit/types";

export async function getAuditGroups() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_station_groups")
    .select("id,slug,name,description,group_type,city,release_status,is_published,rollout_notes,operational_state,recommended_state,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load audit station groups", error);
    return [] as AuditStationGroup[];
  }

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    groupType: row.group_type,
    city: row.city,
    releaseStatus: row.release_status,
    isPublished: row.is_published,
    rolloutNotes: row.rollout_notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    operationalState: row.operational_state,
    recommendedState: row.recommended_state
  }));
}

export async function getAuditGroupBySlug(slug: string): Promise<AuditStationGroup | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_station_groups")
    .select("id,slug,name,description,group_type,city,release_status,is_published,rollout_notes,operational_state,recommended_state,is_active,created_at,updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load audit station group", error);
    }
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    groupType: data.group_type,
    city: data.city,
    releaseStatus: data.release_status,
    isPublished: data.is_published,
    rolloutNotes: data.rollout_notes,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    operationalState: data.operational_state,
    recommendedState: data.recommended_state
  };
}

export async function getAuditGroupMembers(groupId: string): Promise<AuditStationGroupMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_station_group_members")
    .select("id,group_id,station_id,notes,created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Failed to load audit group members", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    stationId: row.station_id,
    notes: row.notes,
    createdAt: row.created_at
  }));
}
