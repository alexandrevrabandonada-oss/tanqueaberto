import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface LaunchFunnelStepRow {
  step: string;
  count: number;
  rateFromPrevious: number;
}

export interface LaunchSurfaceConversionRow {
  surface: string;
  opened: number;
  converted: number;
  conversionRate: number;
}

export interface LaunchRouteErrorRow {
  route: string;
  errors: number;
  topReasons: Array<{ reason: string; count: number }>;
}

export interface LaunchQueueRow {
  added: number;
  completed: number;
  discarded: number;
  retried: number;
  completionRate: number;
  discardRate: number;
}

export interface LaunchDraftRestoreRow {
  restored: number;
  photoLost: number;
  restoreRate: number;
  photoLossRate: number;
}

export interface LaunchApprovalLatencyRow {
  approvals: number;
  rejections: number;
  pending: number;
  avgMinutes: number;
  medianMinutes: number;
  p90Minutes: number;
  byCity: Array<{ city: string; approvals: number; avgMinutes: number }>;
}

export interface LaunchIdentityPromptRow {
  shown: number;
  saved: number;
  dismissed: number;
  saveRate: number;
  dismissRate: number;
  byContext: Array<{ context: string; shown: number; saved: number; dismissed: number }>;
  bySource: Array<{ source: string; shown: number; saved: number; dismissed: number }>;
}

export interface LaunchObservabilityReport {
  funnel: {
    steps: LaunchFunnelStepRow[];
    bySurface: LaunchSurfaceConversionRow[];
  };
  errorsByRoute: LaunchRouteErrorRow[];
  queue: LaunchQueueRow;
  draftRestore: LaunchDraftRestoreRow;
  approvalLatency: LaunchApprovalLatencyRow;
  identityPrompts: LaunchIdentityPromptRow;
}

const FUNNEL_ORDER = [
  "home_opened",
  "home_search_used",
  "station_clicked",
  "submit_opened",
  "submission_started",
  "submission_accepted",
  "moderation_approved",
  "hub_opened"
] as const;

const SURFACE_ORDER = ["/", "/postos/[id]", "/enviar", "/hub"] as const;

function getPayloadString(row: Record<string, unknown>, key: string) {
  const payload = (row.payload as Record<string, unknown> | undefined) ?? {};
  const value = payload[key];
  return typeof value === "string" ? value : null;
}


function getRouteFromEvent(row: Record<string, unknown>) {
  const explicit = getPayloadString(row, "pagePath");
  if (explicit) return explicit;

  const scopeType = typeof row.scope_type === "string" ? row.scope_type : null;
  const eventType = typeof row.event_type === "string" ? row.event_type : null;

  if (scopeType === "submission" || (eventType && eventType.startsWith("submission_"))) return "/enviar";
  if (scopeType === "auth" || (eventType && eventType.startsWith("auth_"))) return "/admin/login";
  if (scopeType === "report" || eventType === "moderated") return "/admin";
  if (scopeType === "station" || eventType === "station_opened") return "/postos/[id]";
  if (eventType === "hub_opened" || eventType === "hub_action_clicked" || eventType === "hub_conversion_success") return "/hub";
  return typeof row.scope_id === "string" && row.scope_id ? row.scope_id : "/";
}

function countEvent(events: Array<Record<string, unknown>>, eventType: string) {
  return events.filter((event) => String(event.event_type) === eventType).length;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function p90(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
}

export async function getLaunchObservabilityReport(days = 7): Promise<LaunchObservabilityReport> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [operationalResult, reportsResult] = await Promise.all([
    supabase
      .from("operational_events")
      .select("id,event_type,severity,scope_type,scope_id,actor_email,ip_hash,station_id,report_id,city,fuel_type,reason,payload,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("price_reports")
      .select("station_id,city,status,submitted_at,approved_at,rejected_at,created_at")
      .gte("created_at", since)
  ]);

  const operationalEvents = (operationalResult.data ?? []) as Array<Record<string, unknown>>;
  const priceReports = (reportsResult.data ?? []) as Array<Record<string, unknown>>;

  const stepCounts = new Map<string, number>();
  for (const step of FUNNEL_ORDER) {
    stepCounts.set(step, countEvent(operationalEvents, step));
  }

  const steps: LaunchFunnelStepRow[] = FUNNEL_ORDER.map((step, index) => {
    const count = stepCounts.get(step) ?? 0;
    const previous = index === 0 ? count : stepCounts.get(FUNNEL_ORDER[index - 1]) ?? 0;
    return {
      step,
      count,
      rateFromPrevious: index === 0 ? 100 : percent(count, previous)
    };
  });

  const surfaceMap = new Map<string, { opened: number; converted: number }>();
  for (const surface of SURFACE_ORDER) {
    surfaceMap.set(surface, { opened: 0, converted: 0 });
  }

  for (const event of operationalEvents) {
    const route = getRouteFromEvent(event);
    const bucket = surfaceMap.get(route) ?? { opened: 0, converted: 0 };
    if (String(event.event_type) === "home_opened" || String(event.event_type) === "station_opened" || String(event.event_type) === "submit_opened" || String(event.event_type) === "hub_opened") {
      bucket.opened += 1;
    }
    if (String(event.event_type) === "submission_accepted" || String(event.event_type) === "hub_conversion_success" || String(event.event_type) === "moderation_approved") {
      bucket.converted += 1;
    }
    surfaceMap.set(route, bucket);
  }

  const bySurface = Array.from(surfaceMap.entries()).map(([surface, value]) => ({
    surface,
    opened: value.opened,
    converted: value.converted,
    conversionRate: percent(value.converted, value.opened)
  }));

  const errorsByRouteMap = new Map<string, { errors: number; reasons: Map<string, number> }>();
  for (const event of operationalEvents) {
    const eventType = String(event.event_type);
    if (!eventType.startsWith("submission_") && !eventType.startsWith("upload_") && !eventType.startsWith("auth_")) {
      continue;
    }

    const route = getRouteFromEvent(event);
    const entry = errorsByRouteMap.get(route) ?? { errors: 0, reasons: new Map<string, number>() };
    entry.errors += 1;
    const reason = typeof event.reason === "string" && event.reason ? event.reason : eventType;
    entry.reasons.set(reason, (entry.reasons.get(reason) ?? 0) + 1);
    errorsByRouteMap.set(route, entry);
  }

  const errorsByRoute = Array.from(errorsByRouteMap.entries())
    .map(([route, value]) => ({
      route,
      errors: value.errors,
      topReasons: Array.from(value.reasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 3)
    }))
    .sort((left, right) => right.errors - left.errors);

  const queueAdded = countEvent(operationalEvents, "submission_queue_added");
  const queueCompleted = countEvent(operationalEvents, "submission_queue_completed");
  const queueDiscarded = countEvent(operationalEvents, "submission_queue_discarded");
  const queueRetried = countEvent(operationalEvents, "submission_queue_retried");

  const draftRestore = countEvent(operationalEvents, "submission_draft_restored");
  const photoLost = countEvent(operationalEvents, "submission_photo_lost");

  const approvalDurations: number[] = [];
  const approvalDurationsByCity = new Map<string, { total: number; count: number }>();
  let approvals = 0;
  let rejections = 0;
  let pending = 0;

  for (const report of priceReports) {
    const status = String(report.status);
    if (status === "pending") pending += 1;
    if (status === "approved") approvals += 1;
    if (status === "rejected") rejections += 1;

    const submittedAt = report.submitted_at || report.created_at;
    const closedAt = report.approved_at || report.rejected_at;
    if (!submittedAt || !closedAt) continue;

    const duration = (new Date(String(closedAt)).getTime() - new Date(String(submittedAt)).getTime()) / 60000;
    if (duration <= 0) continue;
    approvalDurations.push(duration);

    const city = typeof report.city === "string" && report.city ? report.city : "Sem cidade";
    const current = approvalDurationsByCity.get(city) ?? { total: 0, count: 0 };
    current.total += duration;
    current.count += 1;
    approvalDurationsByCity.set(city, current);
  }

  const identityShownByContext = new Map<string, { shown: number; saved: number; dismissed: number }>();
  const identityShownBySource = new Map<string, { shown: number; saved: number; dismissed: number }>();
  let identityShown = 0;
  let identitySaved = 0;
  let identityDismissed = 0;

  for (const event of operationalEvents) {
    const eventType = String(event.event_type);
    if (!eventType.startsWith("identity_prompt_")) continue;

    const context = getPayloadString(event, "context") ?? "unknown";
    const source = getPayloadString(event, "source") ?? "unknown";
    const contextBucket = identityShownByContext.get(context) ?? { shown: 0, saved: 0, dismissed: 0 };
    const sourceBucket = identityShownBySource.get(source) ?? { shown: 0, saved: 0, dismissed: 0 };

    if (eventType === "identity_prompt_shown") {
      identityShown += 1;
      contextBucket.shown += 1;
      sourceBucket.shown += 1;
    }
    if (eventType === "identity_prompt_saved") {
      identitySaved += 1;
      contextBucket.saved += 1;
      sourceBucket.saved += 1;
    }
    if (eventType === "identity_prompt_dismissed") {
      identityDismissed += 1;
      contextBucket.dismissed += 1;
      sourceBucket.dismissed += 1;
    }

    identityShownByContext.set(context, contextBucket);
    identityShownBySource.set(source, sourceBucket);
  }

  return {
    funnel: {
      steps,
      bySurface
    },
    errorsByRoute,
    queue: {
      added: queueAdded,
      completed: queueCompleted,
      discarded: queueDiscarded,
      retried: queueRetried,
      completionRate: percent(queueCompleted, queueAdded),
      discardRate: percent(queueDiscarded, queueAdded)
    },
    draftRestore: {
      restored: draftRestore,
      photoLost,
      restoreRate: percent(draftRestore, countEvent(operationalEvents, "submit_opened") || 1),
      photoLossRate: percent(photoLost, draftRestore || 1)
    },
    approvalLatency: {
      approvals,
      rejections,
      pending,
      avgMinutes: approvalDurations.length ? Math.round(approvalDurations.reduce((sum, value) => sum + value, 0) / approvalDurations.length) : 0,
      medianMinutes: Math.round(median(approvalDurations)),
      p90Minutes: Math.round(p90(approvalDurations)),
      byCity: Array.from(approvalDurationsByCity.entries())
        .map(([city, value]) => ({ city, approvals: value.count, avgMinutes: Math.round(value.total / value.count) }))
        .sort((left, right) => right.avgMinutes - left.avgMinutes)
        .slice(0, 10)
    },
    identityPrompts: {
      shown: identityShown,
      saved: identitySaved,
      dismissed: identityDismissed,
      saveRate: percent(identitySaved, identityShown),
      dismissRate: percent(identityDismissed, identityShown),
      byContext: Array.from(identityShownByContext.entries()).map(([context, value]) => ({ context, ...value })).sort((left, right) => right.shown - left.shown),
      bySource: Array.from(identityShownBySource.entries()).map(([source, value]) => ({ source, ...value })).sort((left, right) => right.shown - left.shown)
    }
  };
}
