import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getActiveStations } from "@/lib/data/queries";
import type { FuelType } from "@/lib/types";

export interface OperationalEventItem {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  scopeType: string | null;
  scopeId: string | null;
  actorEmail: string | null;
  stationId: string | null;
  reportId: string | null;
  city: string | null;
  fuelType: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminActionLogItem {
  id: string;
  actionKind: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  note: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OperationalTelemetry {
  summary: {
    submissions: number;
    approvals: number;
    rejections: number;
    blockedSubmissions: number;
    uploadErrors: number;
    authErrors: number;
    cronErrors: number;
    manualRuns: number;
    cityVolume: number;
    fuelVolume: number;
  };
  byCity: Array<{ city: string; count: number; approved: number; pending: number; rejected: number }>;
  byFuel: Array<{ fuelType: FuelType; count: number; approved: number; pending: number; rejected: number }>;
  recentEvents: OperationalEventItem[];
  recentAdminActions: AdminActionLogItem[];
}

function toEventItem(row: Record<string, unknown>): OperationalEventItem {
  return {
    id: String(row.id),
    eventType: String(row.event_type),
    severity: (row.severity as OperationalEventItem["severity"]) ?? "info",
    scopeType: row.scope_type ? String(row.scope_type) : null,
    scopeId: row.scope_id ? String(row.scope_id) : null,
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    stationId: row.station_id ? String(row.station_id) : null,
    reportId: row.report_id ? String(row.report_id) : null,
    city: row.city ? String(row.city) : null,
    fuelType: row.fuel_type ? String(row.fuel_type) : null,
    reason: row.reason ? String(row.reason) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at)
  };
}

function toAdminActionItem(row: Record<string, unknown>): AdminActionLogItem {
  return {
    id: String(row.id),
    actionKind: String(row.action_kind),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    note: row.note ? String(row.note) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at)
  };
}

export async function getOperationalTelemetry(days = 7): Promise<OperationalTelemetry> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const stations = await getActiveStations();
  const stationCityById = new Map(stations.map((station) => [station.id, station.city]));

  const [submissionsResult, operationalResult, adminResult, jobsResult] = await Promise.all([
    supabase.from("price_reports").select("id,status,station_id,fuel_type,created_at").gte("created_at", since),
    supabase.from("operational_events").select("id,event_type,severity,scope_type,scope_id,actor_email,station_id,report_id,city,fuel_type,reason,payload,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    supabase.from("admin_action_logs").select("id,action_kind,actor_id,actor_email,target_type,target_id,note,payload,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    supabase.from("ops_job_runs").select("status,cadence").gte("started_at", since)
  ]);

  const submissions = submissionsResult.data ?? [];
  const events = operationalResult.data ?? [];
  const adminLogs = adminResult.data ?? [];
  const jobRuns = jobsResult.data ?? [];

  const byCityMap = new Map<string, { city: string; count: number; approved: number; pending: number; rejected: number }>();
  const byFuelMap = new Map<string, { fuelType: FuelType; count: number; approved: number; pending: number; rejected: number }>();

  for (const row of submissions as Array<{ status: string; station_id: string | null; fuel_type: FuelType }>) {
    const city = (row.station_id ? stationCityById.get(row.station_id) : null) ?? "Sem cidade";
    const cityCurrent = byCityMap.get(city) ?? { city, count: 0, approved: 0, pending: 0, rejected: 0 };
    cityCurrent.count += 1;
    if (row.status === "approved") cityCurrent.approved += 1;
    if (row.status === "pending") cityCurrent.pending += 1;
    if (row.status === "rejected") cityCurrent.rejected += 1;
    byCityMap.set(city, cityCurrent);

    const fuelKey = row.fuel_type;
    const fuelCurrent = byFuelMap.get(fuelKey) ?? { fuelType: fuelKey, count: 0, approved: 0, pending: 0, rejected: 0 };
    fuelCurrent.count += 1;
    if (row.status === "approved") fuelCurrent.approved += 1;
    if (row.status === "pending") fuelCurrent.pending += 1;
    if (row.status === "rejected") fuelCurrent.rejected += 1;
    byFuelMap.set(fuelKey, fuelCurrent);
  }

  return {
    summary: {
      submissions: submissions.length,
      approvals: submissions.filter((item) => item.status === "approved").length,
      rejections: submissions.filter((item) => item.status === "rejected").length,
      blockedSubmissions: events.filter((event) => event.event_type === "submission_blocked").length,
      uploadErrors: events.filter((event) => String(event.event_type).startsWith("upload_")).length,
      authErrors: events.filter((event) => String(event.event_type).startsWith("auth_")).length,
      cronErrors: jobRuns.filter((job) => job.status === "failed").length,
      manualRuns: jobRuns.filter((job) => job.cadence === "manual").length,
      cityVolume: byCityMap.size,
      fuelVolume: byFuelMap.size
    },
    byCity: Array.from(byCityMap.values()).sort((left, right) => right.count - left.count || left.city.localeCompare(right.city)),
    byFuel: Array.from(byFuelMap.values()).sort((left, right) => right.count - left.count || left.fuelType.localeCompare(right.fuelType)),
    recentEvents: events.map((row) => toEventItem(row as Record<string, unknown>)),
    recentAdminActions: adminLogs.map((row) => toAdminActionItem(row as Record<string, unknown>))
  };
}

