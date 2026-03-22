import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditAlert, AuditAlertHistoryItem, AuditAlertHistoryStatus, AuditScopeType, AuditWindowDays } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";

export async function recordAuditAlertHistory(input: {
  alert: AuditAlert;
  scopeType: AuditScopeType;
  scopeLabel: string;
  fuelType: FuelType;
  periodDays: AuditWindowDays;
  periodStart: string;
  periodEnd: string;
  citySlug?: string | null;
  cityName?: string | null;
  stationId?: string | null;
  stationName?: string | null;
  groupId?: string | null;
  groupSlug?: string | null;
  status?: AuditAlertHistoryStatus;
  intensity?: number | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("audit_alert_history").insert({
    alert_kind: input.alert.kind,
    scope_type: input.scopeType,
    scope_label: input.scopeLabel,
    fuel_type: input.fuelType,
    period_days: input.periodDays,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    city_slug: input.citySlug ?? input.alert.city?.toLowerCase().replace(/\s+/g, "-") ?? null,
    city_name: input.cityName ?? input.alert.city ?? null,
    station_id: input.stationId ?? input.alert.stationId ?? null,
    station_name: input.stationName ?? input.alert.stationName ?? null,
    group_id: input.groupId ?? null,
    group_slug: input.groupSlug ?? null,
    intensity: input.intensity ?? (typeof input.alert.value === "number" ? input.alert.value : null),
    status: input.status ?? "novo",
    payload: {
      alert: input.alert,
      ...input.payload
    }
  });

  if (error) {
    console.error("Failed to record audit alert history", error);
  }
}

export async function getRecentAuditAlertHistory(limit = 24): Promise<AuditAlertHistoryItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_alert_history")
    .select("id,alert_kind,scope_type,scope_label,fuel_type,city_slug,city_name,station_id,station_name,group_id,group_slug,period_days,period_start,period_end,intensity,status,payload,generated_at,created_at")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load audit alert history", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    alertKind: row.alert_kind,
    scopeType: row.scope_type,
    scopeLabel: row.scope_label,
    fuelType: row.fuel_type,
    citySlug: row.city_slug,
    cityName: row.city_name,
    stationId: row.station_id,
    stationName: row.station_name,
    groupId: row.group_id,
    groupSlug: row.group_slug,
    periodDays: row.period_days,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    intensity: row.intensity === null ? null : Number(row.intensity),
    status: row.status,
    payload: row.payload as Record<string, unknown>,
    generatedAt: row.generated_at,
    createdAt: row.created_at
  }));
}
