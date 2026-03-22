import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditReportRunItem, AuditScopeType, AuditWindowDays, AuditVisibilityStatus } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";

function getPeriodBounds(days: AuditWindowDays) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10)
  };
}

export async function recordAuditReportRun(input: {
  scopeType: AuditScopeType;
  scopeLabel: string;
  fuelType: FuelType;
  days: AuditWindowDays;
  title: string;
  summary: Record<string, unknown>;
  alertsCount: number;
  visibilityStatus?: AuditVisibilityStatus;
  citySlug?: string | null;
  cityName?: string | null;
  stationId?: string | null;
  stationName?: string | null;
  groupId?: string | null;
  groupSlug?: string | null;
  groupName?: string | null;
  artifactFormat?: string | null;
  artifactPath?: string | null;
  artifactUrl?: string | null;
  createdBy?: string | null;
}) {
  const { periodStart, periodEnd } = getPeriodBounds(input.days);
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("audit_report_runs").insert({
    scope_type: input.scopeType,
    scope_label: input.scopeLabel,
    city_slug: input.citySlug ?? null,
    city_name: input.cityName ?? null,
    station_id: input.stationId ?? null,
    station_name: input.stationName ?? null,
    group_id: input.groupId ?? null,
    group_slug: input.groupSlug ?? null,
    group_name: input.groupName ?? null,
    fuel_type: input.fuelType,
    days: input.days,
    period_start: periodStart,
    period_end: periodEnd,
    title: input.title,
    summary: input.summary,
    alerts_count: input.alertsCount,
    visibility_status: input.visibilityStatus ?? "public",
    artifact_format: input.artifactFormat ?? null,
    artifact_path: input.artifactPath ?? null,
    artifact_url: input.artifactUrl ?? null,
    created_by: input.createdBy ?? null
  });

  if (error) {
    console.error("Failed to record audit report run", error);
  }
}

export async function getRecentAuditReportRuns(limit = 24): Promise<AuditReportRunItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_report_runs")
    .select("id,scope_type,scope_label,city_slug,city_name,station_id,station_name,group_id,group_slug,group_name,fuel_type,days,period_start,period_end,title,summary,alerts_count,visibility_status,artifact_format,artifact_path,artifact_url,created_by,generated_at,created_at")
    .eq("visibility_status", "public")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load audit report runs", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    scopeType: row.scope_type,
    scopeLabel: row.scope_label,
    citySlug: row.city_slug,
    cityName: row.city_name,
    stationId: row.station_id,
    stationName: row.station_name,
    groupId: row.group_id,
    groupSlug: row.group_slug,
    groupName: row.group_name,
    fuelType: row.fuel_type,
    days: row.days,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    title: row.title,
    summary: row.summary as Record<string, unknown>,
    alertsCount: row.alerts_count,
    visibilityStatus: row.visibility_status,
    artifactFormat: row.artifact_format,
    artifactPath: row.artifact_path,
    artifactUrl: row.artifact_url,
    createdBy: row.created_by,
    generatedAt: row.generated_at,
    createdAt: row.created_at
  }));
}

export async function getAuditReportRunById(id: string): Promise<AuditReportRunItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_report_runs")
    .select("id,scope_type,scope_label,city_slug,city_name,station_id,station_name,group_id,group_slug,group_name,fuel_type,days,period_start,period_end,title,summary,alerts_count,visibility_status,artifact_format,artifact_path,artifact_url,created_by,generated_at,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data || data.visibility_status !== "public") {
    if (error) {
      console.error("Failed to load audit report run", error);
    }
    return null;
  }

  return {
    id: data.id,
    scopeType: data.scope_type,
    scopeLabel: data.scope_label,
    citySlug: data.city_slug,
    cityName: data.city_name,
    stationId: data.station_id,
    stationName: data.station_name,
    groupId: data.group_id,
    groupSlug: data.group_slug,
    groupName: data.group_name,
    fuelType: data.fuel_type,
    days: data.days,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    title: data.title,
    summary: data.summary as Record<string, unknown>,
    alertsCount: data.alerts_count,
    visibilityStatus: data.visibility_status,
    artifactFormat: data.artifact_format,
    artifactPath: data.artifact_path,
    artifactUrl: data.artifact_url,
    createdBy: data.created_by,
    generatedAt: data.generated_at,
    createdAt: data.created_at
  };
}
