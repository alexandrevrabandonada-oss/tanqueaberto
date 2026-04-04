import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ContributorTrustLevel, SubmissionRiskLevel, SubmissionRouting } from "@/lib/types";
import { getKillSwitches, type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { getProgressiveTrustRollout, type ProgressiveTrustRollout } from "@/lib/ops/progressive-trust";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";

const TRUST_LEVELS: ContributorTrustLevel[] = ["N0", "N1", "N2", "N3"];
const RISK_LEVELS: SubmissionRiskLevel[] = ["low", "medium", "high"];
const ROUTING_LEVELS: SubmissionRouting[] = ["review_normal", "fast_lane", "auto_approved"];

interface ReportOpsRow {
  id: string;
  station_id: string;
  fuel_type: string;
  price: number;
  reported_at: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  reporter_nickname: string | null;
  status: string;
  moderation_reason: string | null;
  moderation_note: string | null;
  location_confidence: string | null;
  location_distance: number | null;
  metadata: Record<string, unknown> | null;
}

interface StationOpsRow {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  visibility_status?: string | null;
  geo_review_status?: string | null;
}

interface CorrectionEventRow {
  report_id: string | null;
  created_at: string;
  reason: string | null;
}

export interface ProgressiveTrustQueueItem {
  id: string;
  stationId: string;
  stationName: string;
  city: string;
  neighborhood: string;
  fuelType: string;
  price: number;
  reportedAt: string;
  approvedAt: string | null;
  status: string;
  reporterNickname: string | null;
  contributorTrustLevel: ContributorTrustLevel;
  submissionRiskLevel: SubmissionRiskLevel;
  submissionRouting: SubmissionRouting;
  routeReason: string;
  riskReason: string;
  historySummary: string[];
  rolloutPhase: number | null;
  rolloutLabel: string | null;
  evidenceMode: string | null;
  locationConfidence: string | null;
  locationDistance: number | null;
  correctionAfterAutoApproval: boolean;
  correctedAt: string | null;
  correctedReason: string | null;
}

export interface ProgressiveTrustRateBucket {
  key: string;
  label: string;
  total: number;
  corrected: number;
  correctionRate: number;
}

export interface ProgressiveTrustPhaseImpact {
  phase: number;
  label: string;
  totalReports: number;
  autoApproved: number;
  correctedAutoApproved: number;
  correctionRate: number;
}

export interface ProgressiveTrustOperationalReadout {
  generatedAt: string;
  windowDays: number;
  rollout: ProgressiveTrustRollout;
  killSwitches: OperationalKillSwitches;
  totals: {
    totalReports: number;
    reviewNormal: number;
    fastLane: number;
    autoApproved: number;
    correctedAutoApproved: number;
  };
  queue: {
    pendingTotal: number;
    pendingFastLane: number;
    pendingHighRisk: number;
    pendingReviewNormal: number;
  };
  impact: {
    queueReductionEstimate: number;
    queueReductionRate: number;
    fastLaneReviewShare: number;
    autoApprovedErrorRate: number;
    avgFastLaneApprovalMs: number;
    avgFastLaneApprovalMinutes: number;
    moderationLoadSaved: number;
  };
  ratesByTrust: ProgressiveTrustRateBucket[];
  ratesByRisk: ProgressiveTrustRateBucket[];
  phaseImpact: ProgressiveTrustPhaseImpact[];
  topReviewReasons: Array<{ label: string; count: number }>;
  pendingFastLaneItems: ProgressiveTrustQueueItem[];
  pendingHighRiskItems: ProgressiveTrustQueueItem[];
  recentAutoApprovedItems: ProgressiveTrustQueueItem[];
  correctedAutoApprovedItems: ProgressiveTrustQueueItem[];
}

function readString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function readNumber(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readTrustLevel(metadata: Record<string, unknown> | null | undefined): ContributorTrustLevel {
  const value = readString(metadata, "contributor_trust_level");
  return value === "N1" || value === "N2" || value === "N3" ? value : "N0";
}

function readRiskLevel(metadata: Record<string, unknown> | null | undefined, status: string): SubmissionRiskLevel {
  const value = readString(metadata, "submission_risk_level");
  if (value === "low" || value === "medium" || value === "high") return value;
  return status === "flagged" ? "high" : "medium";
}

function readRouting(metadata: Record<string, unknown> | null | undefined): SubmissionRouting {
  const value = readString(metadata, "submission_routing");
  if (value === "fast_lane" || value === "auto_approved") return value;
  return "review_normal";
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function minutesFromMs(value: number) {
  return value > 0 ? Math.round((value / 60000) * 10) / 10 : 0;
}

function buildQueueItem(
  row: ReportOpsRow,
  station: StationOpsRow | undefined,
  correctedAt: string | null,
  correctedReason: string | null
): ProgressiveTrustQueueItem {
  const submissionRouting = readRouting(row.metadata);
  const submissionRiskLevel = readRiskLevel(row.metadata, row.status);
  const routeReasons = readStringArray(row.metadata, "submission_routing_reasons");
  const riskReasons = readStringArray(row.metadata, "submission_risk_reasons");
  const historySummary = readStringArray(row.metadata, "contributor_history_summary");

  return {
    id: row.id,
    stationId: row.station_id,
    stationName: station?.name ?? "Posto sem nome",
    city: station?.city ?? readString(row.metadata, "station_city") ?? "Cidade indisponível",
    neighborhood: station?.neighborhood ?? "Bairro indisponível",
    fuelType: row.fuel_type,
    price: Number(row.price ?? 0),
    reportedAt: row.reported_at,
    approvedAt: row.approved_at,
    status: row.status,
    reporterNickname: row.reporter_nickname,
    contributorTrustLevel: readTrustLevel(row.metadata),
    submissionRiskLevel,
    submissionRouting,
    routeReason: routeReasons[0] ?? (submissionRouting === "review_normal" ? "fluxo padrão de revisão" : submissionRouting),
    riskReason: riskReasons[0] ?? row.moderation_reason ?? "sem motivo adicional salvo",
    historySummary,
    rolloutPhase: readNumber(row.metadata, "progressive_trust_rollout_phase"),
    rolloutLabel: readString(row.metadata, "progressive_trust_rollout_label"),
    evidenceMode: readString(row.metadata, "evidence_mode"),
    locationConfidence: row.location_confidence,
    locationDistance: row.location_distance,
    correctionAfterAutoApproval: Boolean(correctedAt),
    correctedAt,
    correctedReason,
  };
}

function topBucketsFromRows(rows: ReportOpsRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const routing = readRouting(row.metadata);
    if (routing !== "review_normal") return;
    const riskReasons = readStringArray(row.metadata, "submission_risk_reasons");
    const routeReasons = readStringArray(row.metadata, "submission_routing_reasons");
    const reason = riskReasons[0] ?? routeReasons[0] ?? row.moderation_reason ?? "fluxo padrão de revisão";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function buildRateBuckets<T extends string>(
  keys: T[],
  labelMap: Record<T, string>,
  rows: ReportOpsRow[],
  correctedSet: Set<string>,
  selector: (row: ReportOpsRow) => T
) {
  return keys.map((key) => {
    const matching = rows.filter((row) => selector(row) === key && readRouting(row.metadata) === "auto_approved");
    const corrected = matching.filter((row) => correctedSet.has(row.id)).length;
    return {
      key,
      label: labelMap[key],
      total: matching.length,
      corrected,
      correctionRate: percentage(corrected, matching.length)
    };
  });
}

function buildPhaseImpact(rows: ReportOpsRow[], correctedSet: Set<string>) {
  const buckets = new Map<number, ProgressiveTrustPhaseImpact>();

  rows.forEach((row) => {
    const phase = readNumber(row.metadata, "progressive_trust_rollout_phase") ?? 0;
    const label = readString(row.metadata, "progressive_trust_rollout_label") ?? `fase_${phase || "desconhecida"}`;
    const current = buckets.get(phase) ?? {
      phase,
      label,
      totalReports: 0,
      autoApproved: 0,
      correctedAutoApproved: 0,
      correctionRate: 0
    };

    current.totalReports += 1;
    if (readRouting(row.metadata) === "auto_approved") {
      current.autoApproved += 1;
      if (correctedSet.has(row.id)) current.correctedAutoApproved += 1;
    }

    buckets.set(phase, current);
  });

  return Array.from(buckets.values())
    .map((item) => ({
      ...item,
      correctionRate: percentage(item.correctedAutoApproved, item.autoApproved)
    }))
    .sort((left, right) => left.phase - right.phase);
}

export async function getProgressiveTrustOperationalReadout(windowDays = 14): Promise<ProgressiveTrustOperationalReadout> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const [rollout, killSwitches, recentResult, pendingResult] = await Promise.all([
    getProgressiveTrustRollout(),
    getKillSwitches(),
    supabase
      .from("price_reports")
      .select("id,station_id,fuel_type,price,reported_at,created_at,approved_at,rejected_at,reporter_nickname,status,moderation_reason,moderation_note,location_confidence,location_distance,metadata")
      .gte("reported_at", since)
      .order("reported_at", { ascending: false })
      .limit(2500),
    supabase
      .from("price_reports")
      .select("id,station_id,fuel_type,price,reported_at,created_at,approved_at,rejected_at,reporter_nickname,status,moderation_reason,moderation_note,location_confidence,location_distance,metadata")
      .in("status", ["pending", "flagged"])
      .order("reported_at", { ascending: true })
      .limit(300)
  ]);

  if (recentResult.error || pendingResult.error) {
    logRuntimeIssue("Failed to build progressive trust operational readout", recentResult.error ?? pendingResult.error, {
      scope: "ops",
      surface: "progressive-trust-operations.getProgressiveTrustOperationalReadout",
      fallback: "empty-readout",
      optional: true,
      schemaSensitive: true
    });
  }

  const recentRows = (recentResult.data ?? []) as ReportOpsRow[];
  const pendingRows = (pendingResult.data ?? []) as ReportOpsRow[];
  const stationIds = Array.from(new Set([...recentRows, ...pendingRows].map((row) => row.station_id).filter(Boolean)));

  const [stationsResult, correctedEventsResult] = await Promise.all([
    stationIds.length > 0
      ? supabase
          .from("stations")
          .select("id,name,city,neighborhood,visibility_status,geo_review_status")
          .in("id", stationIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("operational_events")
      .select("report_id,created_at,reason")
      .eq("event_type", "progressive_trust_auto_approved_corrected")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500)
  ]);

  if (stationsResult.error || correctedEventsResult.error) {
    logRuntimeIssue("Failed to enrich progressive trust operational readout", stationsResult.error ?? correctedEventsResult.error, {
      scope: "ops",
      surface: "progressive-trust-operations.getProgressiveTrustOperationalReadout.enrichment",
      fallback: "partial-readout",
      optional: true,
      schemaSensitive: true
    });
  }

  const stations = new Map(((stationsResult.data ?? []) as StationOpsRow[]).map((station) => [station.id, station]));
  const correctedEvents = (correctedEventsResult.data ?? []) as CorrectionEventRow[];
  const correctionMap = new Map<string, CorrectionEventRow>();
  correctedEvents.forEach((event) => {
    if (!event.report_id || correctionMap.has(event.report_id)) return;
    correctionMap.set(event.report_id, event);
  });
  const correctedSet = new Set(Array.from(correctionMap.keys()));

  const totals = ROUTING_LEVELS.reduce(
    (acc, routing) => {
      acc[routing] = recentRows.filter((row) => readRouting(row.metadata) === routing).length;
      return acc;
    },
    {
      review_normal: 0,
      fast_lane: 0,
      auto_approved: 0
    } as Record<SubmissionRouting, number>
  );

  const correctedAutoApprovedCount = recentRows.filter((row) => readRouting(row.metadata) === "auto_approved" && correctedSet.has(row.id)).length;
  const fastLaneApprovedLatencies = recentRows
    .filter((row) => readRouting(row.metadata) === "fast_lane" && row.approved_at)
    .map((row) => new Date(String(row.approved_at)).getTime() - new Date(row.reported_at).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgFastLaneApprovalMs = fastLaneApprovedLatencies.length > 0
    ? fastLaneApprovedLatencies.reduce((sum, value) => sum + value, 0) / fastLaneApprovedLatencies.length
    : 0;

  const pendingFastLaneRows = pendingRows.filter((row) => readRouting(row.metadata) === "fast_lane");
  const pendingHighRiskRows = pendingRows.filter((row) => readRiskLevel(row.metadata, row.status) === "high" || row.status === "flagged");
  const pendingReviewNormalRows = pendingRows.filter((row) => readRouting(row.metadata) === "review_normal");
  const recentAutoApprovedRows = recentRows.filter((row) => readRouting(row.metadata) === "auto_approved");
  const correctedAutoApprovedRows = recentAutoApprovedRows.filter((row) => correctedSet.has(row.id));

  const trustLabelMap: Record<ContributorTrustLevel, string> = {
    N0: "N0",
    N1: "N1",
    N2: "N2",
    N3: "N3"
  };
  const riskLabelMap: Record<SubmissionRiskLevel, string> = {
    low: "Risco baixo",
    medium: "Risco moderado",
    high: "Risco alto"
  };

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    rollout,
    killSwitches,
    totals: {
      totalReports: recentRows.length,
      reviewNormal: totals.review_normal,
      fastLane: totals.fast_lane,
      autoApproved: totals.auto_approved,
      correctedAutoApproved: correctedAutoApprovedCount
    },
    queue: {
      pendingTotal: pendingRows.length,
      pendingFastLane: pendingFastLaneRows.length,
      pendingHighRisk: pendingHighRiskRows.length,
      pendingReviewNormal: pendingReviewNormalRows.length
    },
    impact: {
      queueReductionEstimate: totals.auto_approved,
      queueReductionRate: percentage(totals.auto_approved, recentRows.length),
      fastLaneReviewShare: percentage(totals.fast_lane, recentRows.length),
      autoApprovedErrorRate: percentage(correctedAutoApprovedCount, totals.auto_approved),
      avgFastLaneApprovalMs,
      avgFastLaneApprovalMinutes: minutesFromMs(avgFastLaneApprovalMs),
      moderationLoadSaved: totals.auto_approved
    },
    ratesByTrust: buildRateBuckets(TRUST_LEVELS, trustLabelMap, recentRows, correctedSet, (row) => readTrustLevel(row.metadata)),
    ratesByRisk: buildRateBuckets(RISK_LEVELS, riskLabelMap, recentRows, correctedSet, (row) => readRiskLevel(row.metadata, row.status)),
    phaseImpact: buildPhaseImpact(recentRows, correctedSet),
    topReviewReasons: topBucketsFromRows(pendingRows),
    pendingFastLaneItems: pendingFastLaneRows.slice(0, 12).map((row) => {
      const correction = correctionMap.get(row.id);
      return buildQueueItem(row, stations.get(row.station_id), correction?.created_at ?? null, correction?.reason ?? null);
    }),
    pendingHighRiskItems: pendingHighRiskRows.slice(0, 12).map((row) => {
      const correction = correctionMap.get(row.id);
      return buildQueueItem(row, stations.get(row.station_id), correction?.created_at ?? null, correction?.reason ?? null);
    }),
    recentAutoApprovedItems: recentAutoApprovedRows.slice(0, 12).map((row) => {
      const correction = correctionMap.get(row.id);
      return buildQueueItem(row, stations.get(row.station_id), correction?.created_at ?? null, correction?.reason ?? null);
    }),
    correctedAutoApprovedItems: correctedAutoApprovedRows.slice(0, 12).map((row) => {
      const correction = correctionMap.get(row.id);
      return buildQueueItem(row, stations.get(row.station_id), correction?.created_at ?? null, correction?.reason ?? null);
    })
  };
}