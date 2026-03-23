import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getActiveStations } from "@/lib/data/queries";
import type { FuelType } from "@/lib/types";
import type { AdminActionLogItem, OperationalEventItem, OperationalTelemetry, ProductFunnelSummary } from "./types";

function toEventItem(row: Record<string, unknown>): OperationalEventItem {
  return {
    id: String(row.id),
    eventType: String(row.event_type),
    severity: (row.severity as OperationalEventItem["severity"]) ?? "info",
    scopeType: row.scope_type ? String(row.scope_type) : null,
    scopeId: row.scope_id ? String(row.scope_id) : null,
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    ipHash: row.ip_hash ? String(row.ip_hash) : null,
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

function buildFunnel(events: OperationalEventItem[]): ProductFunnelSummary {
  const count = (eventType: string) => events.filter((event) => event.eventType === eventType).length;
  const homeOpened = count("home_opened");
  const searchUsed = count("home_search_used");
  const stationClicked = count("station_clicked");
  const submitOpened = count("submit_opened");
  const submissionStarted = count("submission_started");
  const submissionAccepted = count("submission_accepted");
  const submissionFailed = count("submission_failed");
  const auditOpened = count("audit_opened");
  const feedbackOpened = count("feedback_opened");
  const feedbackReceived = count("beta_feedback_received");

  const steps = [
    { label: "home_opened", value: homeOpened },
    { label: "home_search_used", value: searchUsed },
    { label: "station_clicked", value: stationClicked },
    { label: "submit_opened", value: submitOpened },
    { label: "submission_started", value: submissionStarted },
    { label: "submission_accepted", value: submissionAccepted }
  ];

  const dropoffBetweenSteps = steps.slice(1).map((step, index) => {
    const previous = steps[index];
    const lost = Math.max(0, previous.value - step.value);
    const rate = previous.value > 0 ? lost / previous.value : 0;
    return { from: previous.label, to: step.label, lost, rate };
  });

  return {
    homeOpened,
    searchUsed,
    stationClicked,
    submitOpened,
    submissionStarted,
    submissionAccepted,
    submissionFailed,
    auditOpened,
    feedbackOpened,
    feedbackReceived,
    dropoffBetweenSteps
  };
}

function buildTopScreens(events: OperationalEventItem[]) {
  const map = new Map<string, { screen: string; count: number; lastAt: string }>();

  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;
    const raw = typeof payload.pagePath === "string" ? payload.pagePath : typeof event.scopeId === "string" ? event.scopeId : event.scopeType ?? "outros";
    const screen = raw || "outros";
    const current = map.get(screen) ?? { screen, count: 0, lastAt: event.createdAt };
    current.count += 1;
    if (event.createdAt > current.lastAt) {
      current.lastAt = event.createdAt;
    }
    map.set(screen, current);
  }

  return Array.from(map.values())
    .sort((left, right) => right.count - left.count || right.lastAt.localeCompare(left.lastAt))
    .slice(0, 10);
}

export async function getOperationalTelemetry(days = 7): Promise<OperationalTelemetry> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const stations = await getActiveStations();
  const stationCityById = new Map(stations.map((station) => [station.id, station.city]));

  const [submissionsResult, operationalResult, adminResult, jobsResult] = await Promise.all([
    supabase.from("price_reports").select("id,status,station_id,fuel_type,created_at").gte("created_at", since),
    supabase.from("operational_events").select("id,event_type,severity,scope_type,scope_id,actor_email,ip_hash,station_id,report_id,city,fuel_type,reason,payload,created_at").gte("created_at", since).order("created_at", { ascending: false }),
    supabase.from("admin_action_logs").select("id,action_kind,actor_id,actor_email,target_type,target_id,note,payload,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    supabase.from("ops_job_runs").select("status,cadence").gte("started_at", since)
  ]);

  const submissions = submissionsResult.data ?? [];
  const events = (operationalResult.data ?? []).map((row) => toEventItem(row as Record<string, unknown>));
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
      blockedSubmissions: events.filter((event) => event.eventType === "submission_blocked").length,
      uploadErrors: events.filter((event) => String(event.eventType).startsWith("upload_")).length,
      authErrors: events.filter((event) => String(event.eventType).startsWith("auth_")).length,
      cronErrors: jobRuns.filter((job) => job.status === "failed").length,
      manualRuns: jobRuns.filter((job) => job.cadence === "manual").length,
      cityVolume: byCityMap.size,
      fuelVolume: byFuelMap.size
    },
    byCity: Array.from(byCityMap.values()).sort((left, right) => right.count - left.count || left.city.localeCompare(right.city)),
    byFuel: Array.from(byFuelMap.values()).sort((left, right) => right.count - left.count || left.fuelType.localeCompare(right.fuelType)),
    topScreens: buildTopScreens(events),
    funnel: buildFunnel(events),
    recentEvents: events.slice(0, 30),
    recentAdminActions: adminLogs.map((row) => toAdminActionItem(row as Record<string, unknown>))
  };
}
