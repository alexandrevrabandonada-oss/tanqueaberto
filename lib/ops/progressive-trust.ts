import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import { findCollectorTrust, type CollectorTrust } from "@/lib/ops/collector-trust";
import { getKillSwitches } from "@/lib/ops/kill-switches";
import type { ContributorTrustLevel, SubmissionRiskLevel, SubmissionRouting } from "@/lib/types";

export type ProgressiveTrustPhase = 1 | 2 | 3;

export interface ProgressiveTrustRollout {
  phase: ProgressiveTrustPhase;
  fastLaneEnabled: boolean;
  autoApprovalEnabled: boolean;
  shadowMode: boolean;
  label: string;
  configuredFastLaneEnabled: boolean;
  configuredAutoApprovalEnabled: boolean;
  killSwitchActive: boolean;
}

export interface ContributorHistorySnapshot {
  totalReports: number;
  approvedReports: number;
  rejectedReports: number;
  sameDeviceCount: number;
  sameSessionCount: number;
  sameStationCount: number;
  sameCityCount: number;
  stationConsistencyRatio: number;
  geoHighRatio: number;
  rejectionRate: number;
}

export interface ContributorTrustProfile {
  level: ContributorTrustLevel;
  operationalScore: number;
  reasons: string[];
  historySummary: string[];
  collectorScore: number;
  collectorStage: string;
  stats: ContributorHistorySnapshot;
  seenStationIds: string[];
  seenCities: string[];
}

export interface SubmissionRiskProfile {
  level: SubmissionRiskLevel;
  reasons: string[];
  flags: string[];
}

export interface SubmissionRoutingDecision {
  outcome: SubmissionRouting;
  reasons: string[];
  phase: ProgressiveTrustPhase;
  shadowMode: boolean;
  fastLane: boolean;
  autoApproved: boolean;
}

export interface ContributorTrustSummaryLike {
  score?: number | null;
  totalReports?: number | null;
  approvedReports?: number | null;
  rejectedReports?: number | null;
  trustStage?: string | null;
}

interface ContributorRecentReportRow {
  id: string;
  station_id: string;
  status: string;
  location_confidence?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ContributorTrustContext {
  nickname: string | null;
  ipHash: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  stationId?: string | null;
  stationCity?: string | null;
}

export interface SubmissionRiskInput {
  stationId: string;
  stationCity?: string | null;
  stationVisibilityStatus?: string | null;
  stationGeoReviewStatus?: string | null;
  stationProposalMode?: boolean;
  locationConfidence?: string | null;
  duplicateLikely: boolean;
  potentialPhotoReuse: boolean;
  isDuplicate: boolean;
  priceConflict: boolean;
  priceDiscrepancy: boolean;
  alreadyRecentPrice: boolean;
  deviceId?: string | null;
  sessionId?: string | null;
  nickname?: string | null;
  contributorProfile: ContributorTrustProfile;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeCity(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getMetaString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function isBlockedStage(stage: string) {
  const normalized = stage.toLowerCase();
  return normalized === "blocked" || normalized === "bloqueado";
}

function isReviewStage(stage: string) {
  const normalized = stage.toLowerCase();
  return normalized === "review_needed" || normalized === "em_revisão" || normalized === "em_revisao";
}

function deriveLevelFromSummary(summary: ContributorTrustSummaryLike): ContributorTrustLevel {
  const approved = Number(summary.approvedReports ?? 0);
  const total = Number(summary.totalReports ?? 0);
  const rejected = Number(summary.rejectedReports ?? 0);
  const score = Number(summary.score ?? 50);
  const stage = normalizeText(summary.trustStage);
  const rejectionRate = total > 0 ? rejected / total : 0;

  if (isBlockedStage(stage) || rejectionRate >= 0.35 || score < 35) return "N0";
  if (approved >= 12 && rejectionRate <= 0.1 && score >= 85) return "N3";
  if (approved >= 5 && rejectionRate <= 0.2 && score >= 65) return "N2";
  if (approved >= 2 || total >= 4 || score >= 55) return "N1";
  return "N0";
}

export function deriveContributorTrustLevel(summary: ContributorTrustSummaryLike): ContributorTrustLevel {
  return deriveLevelFromSummary(summary);
}

export function deriveContributorTrustReasons(summary: ContributorTrustSummaryLike): string[] {
  const level = deriveLevelFromSummary(summary);
  const approved = Number(summary.approvedReports ?? 0);
  const total = Number(summary.totalReports ?? 0);
  const rejected = Number(summary.rejectedReports ?? 0);
  const score = Math.round(Number(summary.score ?? 50));
  const rejectionRate = total > 0 ? rejected / total : 0;

  const reasons = [`score operacional ${score}`, `${approved} aprovados auditados`, `${rejected} rejeitados`];

  if (level === "N3") reasons.push("histórico estável para autoaprovação limitada");
  else if (level === "N2") reasons.push("histórico confiável para fast-lane");
  else if (level === "N1") reasons.push("já passou do estado totalmente novo");
  else if (rejectionRate > 0.25) reasons.push("taxa de correção ainda alta");
  else reasons.push("volume auditado ainda curto");

  return reasons;
}

export function deriveContributorHistorySummary(summary: ContributorTrustSummaryLike): string[] {
  const approved = Number(summary.approvedReports ?? 0);
  const total = Number(summary.totalReports ?? 0);
  const rejected = Number(summary.rejectedReports ?? 0);
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  return [
    `${approved} aprovados / ${rejected} rejeitados / ${total} totais`,
    `taxa de correção ${rejectionRate}%`
  ];
}

async function loadContributorRecentRows(nickname: string | null, ipHash: string | null): Promise<ContributorRecentReportRow[]> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const byId = new Map<string, ContributorRecentReportRow>();

  try {
    if (nickname) {
      const { data } = await supabase
        .from("price_reports")
        .select("id,station_id,status,location_confidence,metadata")
        .eq("reporter_nickname", nickname)
        .gte("reported_at", since)
        .order("reported_at", { ascending: false })
        .limit(120);

      for (const row of data ?? []) {
        byId.set(String(row.id), row as ContributorRecentReportRow);
      }
    }

    if (ipHash) {
      const { data } = await supabase
        .from("price_reports")
        .select("id,station_id,status,location_confidence,metadata")
        .eq("ip_hash", ipHash)
        .gte("reported_at", since)
        .order("reported_at", { ascending: false })
        .limit(120);

      for (const row of data ?? []) {
        byId.set(String(row.id), row as ContributorRecentReportRow);
      }
    }
  } catch (error) {
    logRuntimeIssue("Failed to load contributor recent reports", error, { scope: "ops", surface: "progressive-trust.loadContributorRecentRows", fallback: "empty-history", optional: true, schemaSensitive: true });
  }

  return Array.from(byId.values());
}

export async function getProgressiveTrustRollout(): Promise<ProgressiveTrustRollout> {
  const supabase = createSupabaseServiceClient();
  const killSwitches = await getKillSwitches();
  let phase: ProgressiveTrustPhase = 2;
  let configuredFastLaneEnabled: boolean | null = null;
  let configuredAutoApprovalEnabled: boolean | null = null;

  try {
    const { data } = await supabase.from("sys_config").select("value").eq("key", "progressive_trust_rollout").maybeSingle();
    const rawValue = data?.value as { phase?: number; fastLaneEnabled?: boolean; autoApprovalEnabled?: boolean } | null;
    const configured = Number(rawValue?.phase ?? 2);
    if (configured === 2 || configured === 3) {
      phase = configured;
    } else if (configured === 1) {
      phase = 1;
    }
    configuredFastLaneEnabled = typeof rawValue?.fastLaneEnabled === "boolean" ? rawValue.fastLaneEnabled : null;
    configuredAutoApprovalEnabled = typeof rawValue?.autoApprovalEnabled === "boolean" ? rawValue.autoApprovalEnabled : null;
  } catch (error) {
    logRuntimeIssue("Failed to read progressive trust rollout, using phase 2", error, { scope: "ops", surface: "progressive-trust.getProgressiveTrustRollout", fallback: "phase-2", optional: true, schemaSensitive: true });
  }

  const killSwitchActive = killSwitches.disable_progressive_trust;
  const requestedFastLaneEnabled = configuredFastLaneEnabled ?? phase >= 2;
  const requestedAutoApprovalEnabled = configuredAutoApprovalEnabled ?? phase >= 3;
  const fastLaneEnabled = !killSwitchActive && phase >= 2 && requestedFastLaneEnabled && !killSwitches.disable_fast_lane;
  const autoApprovalEnabled = !killSwitchActive && phase >= 3 && fastLaneEnabled && requestedAutoApprovalEnabled;

  return {
    phase,
    fastLaneEnabled,
    autoApprovalEnabled,
    shadowMode: phase === 1 || killSwitchActive,
    label: phase === 1 ? "fase_1_shadow" : phase === 2 ? "fase_2_fast_lane" : "fase_3_autoaprovacao_limitada",
    configuredFastLaneEnabled: requestedFastLaneEnabled,
    configuredAutoApprovalEnabled: requestedAutoApprovalEnabled,
    killSwitchActive,
  };
}

export async function buildContributorTrustProfile(context: ContributorTrustContext): Promise<ContributorTrustProfile> {
  const collector = await findCollectorTrust(context.nickname, context.ipHash);
  const rows = await loadContributorRecentRows(context.nickname, context.ipHash);

  const approvedRows = rows.filter((row) => row.status === "approved");
  const rejectedRows = rows.filter((row) => row.status === "rejected");
  const approvedReports = Math.max(collector?.approvedReports ?? 0, approvedRows.length);
  const rejectedReports = Math.max(collector?.rejectedReports ?? 0, rejectedRows.length);
  const totalReports = Math.max(collector?.totalReports ?? 0, rows.length);
  const collectorScore = clamp(Math.round(Number(collector?.score ?? 50)), 0, 100);
  const collectorStage = collector?.trustStage ?? "novo";

  const sameDeviceCount = context.deviceId
    ? rows.filter((row) => getMetaString(row.metadata, "device_id") === context.deviceId).length
    : 0;
  const sameSessionCount = context.sessionId
    ? rows.filter((row) => getMetaString(row.metadata, "session_id") === context.sessionId).length
    : 0;
  const sameStationCount = context.stationId
    ? approvedRows.filter((row) => row.station_id === context.stationId).length
    : 0;
  const sameCityCount = context.stationCity
    ? rows.filter((row) => normalizeCity(getMetaString(row.metadata, "station_city")) === normalizeCity(context.stationCity)).length
    : 0;
  const geoHighCount = rows.filter((row) => String(row.location_confidence ?? getMetaString(row.metadata, "location_confidence")).toLowerCase() === "high").length;
  const stationCounts = new Map<string, number>();
  for (const row of approvedRows) {
    stationCounts.set(row.station_id, (stationCounts.get(row.station_id) ?? 0) + 1);
  }
  const maxStationCount = stationCounts.size > 0 ? Math.max(...Array.from(stationCounts.values())) : 0;
  const stationConsistencyRatio = approvedReports > 0 ? maxStationCount / approvedReports : 0;
  const geoHighRatio = rows.length > 0 ? geoHighCount / rows.length : 0;
  const rejectionRate = totalReports > 0 ? rejectedReports / totalReports : 0;

  const summary: ContributorTrustSummaryLike = {
    score: collectorScore,
    totalReports,
    approvedReports,
    rejectedReports,
    trustStage: collectorStage
  };

  let level = deriveLevelFromSummary(summary);
  if (level === "N3" && !(geoHighRatio >= 0.7 && (sameDeviceCount >= 3 || sameStationCount >= 4 || stationConsistencyRatio >= 0.45))) {
    level = "N2";
  }
  if (level === "N2" && rejectionRate > 0.2) {
    level = "N1";
  }

  const operationalScore = clamp(
    Math.round(
      collectorScore * 0.45
      + approvedReports * 2.8
      - rejectedReports * 5.5
      + sameDeviceCount * 2.5
      + sameSessionCount * 1.5
      + stationConsistencyRatio * 12
      + geoHighRatio * 18
    ),
    0,
    100
  );

  const reasons = uniq([
    ...deriveContributorTrustReasons(summary),
    sameDeviceCount > 0 ? `mesmo aparelho em ${sameDeviceCount} envios` : "",
    sameSessionCount > 0 ? `mesma sessão em ${sameSessionCount} envios` : "",
    sameStationCount > 0 ? `${sameStationCount} aprovações neste posto` : "",
    sameCityCount > 0 ? `${sameCityCount} envios na mesma cidade` : "",
    rows.length > 0 ? `geo boa em ${Math.round(geoHighRatio * 100)}% do histórico recente` : "",
    rejectionRate > 0 ? `taxa de erro auditada ${Math.round(rejectionRate * 100)}%` : "taxa de erro auditada 0%"
  ]);

  const historySummary = uniq([
    ...deriveContributorHistorySummary(summary),
    sameStationCount > 0 ? `recorrência no posto atual: ${sameStationCount}` : "",
    sameCityCount > 0 ? `recorrência territorial: ${sameCityCount} na cidade atual` : "",
    rows.length > 0 ? `geo boa no histórico recente: ${Math.round(geoHighRatio * 100)}%` : ""
  ]);

  return {
    level,
    operationalScore,
    reasons,
    historySummary,
    collectorScore,
    collectorStage,
    stats: {
      totalReports,
      approvedReports,
      rejectedReports,
      sameDeviceCount,
      sameSessionCount,
      sameStationCount,
      sameCityCount,
      stationConsistencyRatio,
      geoHighRatio,
      rejectionRate
    },
    seenStationIds: uniq(rows.map((row) => row.station_id)),
    seenCities: uniq(rows.map((row) => normalizeCity(getMetaString(row.metadata, "station_city"))))
  };
}

export function evaluateSubmissionRisk(input: SubmissionRiskInput): SubmissionRiskProfile {
  const highReasons: string[] = [];
  const mediumReasons: string[] = [];
  const flags: string[] = [];

  if (input.stationProposalMode) {
    highReasons.push("posto novo");
    flags.push("new_station");
  }

  if ((input.stationVisibilityStatus && input.stationVisibilityStatus !== "public") || (input.stationGeoReviewStatus && input.stationGeoReviewStatus !== "ok")) {
    highReasons.push("posto em revisão");
    flags.push("station_under_review");
  }

  if (!input.locationConfidence || input.locationConfidence === "none" || input.locationConfidence === "low") {
    highReasons.push("geolocalização ruim ou ausente");
    flags.push("weak_geo");
  }

  if (input.duplicateLikely || input.potentialPhotoReuse || input.isDuplicate) {
    highReasons.push("suspeita de duplicidade");
    flags.push("duplicate_suspected");
  }

  if (input.priceConflict || input.priceDiscrepancy) {
    highReasons.push("valor fora da faixa recente");
    flags.push("price_outlier");
  }

  if (!input.contributorProfile.seenStationIds.includes(input.stationId)) {
    mediumReasons.push("primeiro envio neste posto");
    flags.push("first_station");
  }

  if (input.stationCity && !input.contributorProfile.seenCities.includes(normalizeCity(input.stationCity))) {
    mediumReasons.push("primeiro envio em território novo");
    flags.push("first_territory");
  }

  if (!input.deviceId && !input.sessionId) {
    mediumReasons.push("contexto fraco do aparelho");
    flags.push("weak_device_context");
  }

  if (!input.nickname) {
    mediumReasons.push("apelido ausente");
    flags.push("weak_identity_context");
  }

  if (input.alreadyRecentPrice && !input.priceConflict) {
    mediumReasons.push("histórico recente ainda pouco estável");
    flags.push("recent_history_unstable");
  }

  if (highReasons.length > 0) {
    return { level: "high", reasons: uniq(highReasons), flags: uniq(flags) };
  }

  if (mediumReasons.length > 0) {
    return { level: "medium", reasons: uniq(mediumReasons), flags: uniq(flags) };
  }

  return {
    level: "low",
    reasons: ["envio coerente com histórico e contexto forte"],
    flags: uniq(flags)
  };
}

export function decideSubmissionRouting(input: {
  rollout: ProgressiveTrustRollout;
  trust: ContributorTrustProfile;
  risk: SubmissionRiskProfile;
}): SubmissionRoutingDecision {
  if (input.rollout.shadowMode) {
    return {
      outcome: "review_normal",
      reasons: ["fase 1: score e nível ainda sem efeito operacional", `${input.trust.level} calculado em shadow mode`],
      phase: input.rollout.phase,
      shadowMode: true,
      fastLane: false,
      autoApproved: false
    };
  }

  if (input.risk.level === "high") {
    return {
      outcome: "review_normal",
      reasons: ["caso sensível continua em revisão", ...input.risk.reasons],
      phase: input.rollout.phase,
      shadowMode: false,
      fastLane: false,
      autoApproved: false
    };
  }

  if (input.rollout.autoApprovalEnabled && input.trust.level === "N3" && input.risk.level === "low") {
    return {
      outcome: "auto_approved",
      reasons: ["N3 autoaprovável", "baixo risco operacional", "rollout permite autoaprovação limitada"],
      phase: input.rollout.phase,
      shadowMode: false,
      fastLane: false,
      autoApproved: true
    };
  }

  if (input.rollout.fastLaneEnabled && (input.trust.level === "N2" || input.trust.level === "N3")) {
    return {
      outcome: "fast_lane",
      reasons: [`${input.trust.level} confiável`, `${input.risk.level === "medium" ? "risco moderado ainda precisa revisão curta" : "baixo risco com revisão acelerada"}`],
      phase: input.rollout.phase,
      shadowMode: false,
      fastLane: true,
      autoApproved: false
    };
  }

  return {
    outcome: "review_normal",
    reasons: ["nível de confiança ainda sem fast-lane operacional"],
    phase: input.rollout.phase,
    shadowMode: false,
    fastLane: false,
    autoApproved: false
  };
}

