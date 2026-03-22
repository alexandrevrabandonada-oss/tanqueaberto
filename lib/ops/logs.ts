import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function recordOperationalEvent(input: {
  eventType: string;
  severity?: "info" | "warning" | "error";
  scopeType?: string | null;
  scopeId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  stationId?: string | null;
  reportId?: string | null;
  city?: string | null;
  fuelType?: string | null;
  ipHash?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("operational_events").insert({
    event_type: input.eventType,
    severity: input.severity ?? "info",
    scope_type: input.scopeType ?? null,
    scope_id: input.scopeId ?? null,
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
    station_id: input.stationId ?? null,
    report_id: input.reportId ?? null,
    city: input.city ?? null,
    fuel_type: input.fuelType ?? null,
    ip_hash: input.ipHash ?? null,
    reason: input.reason ?? null,
    payload: input.payload ?? {}
  });

  if (error) {
    console.error("Failed to record operational event", error);
  }
}

export async function recordAdminActionLog(input: {
  actionKind: string;
  actorId?: string | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  note?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("admin_action_logs").insert({
    action_kind: input.actionKind,
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    note: input.note ?? null,
    payload: input.payload ?? {}
  });

  if (error) {
    console.error("Failed to record admin action log", error);
  }
}
