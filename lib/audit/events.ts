import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function recordPriceReportAuditEvent(input: {
  reportId: string;
  eventType: "created" | "moderated" | "revised" | "exported";
  payload?: Record<string, unknown>;
  actorId?: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("price_report_audit_events").insert({
    report_id: input.reportId,
    event_type: input.eventType,
    payload: input.payload ?? {},
    actor_id: input.actorId ?? null
  });

  if (error) {
    console.error("Failed to record price report audit event", error);
  }
}
