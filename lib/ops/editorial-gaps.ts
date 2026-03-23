import { getAuditGroupMembers, getAuditGroups } from "@/lib/audit/groups";
import { getBetaFeedbackSummary } from "@/lib/beta/feedback";
import { fuelLabels } from "@/lib/format/labels";
import { getApprovedReportsSince, getActiveStations } from "@/lib/data/queries";
import { getOperationalDashboard } from "@/lib/ops/reports";
import { getOperationalTelemetry } from "@/lib/ops/observability";
import type { FuelType, Station } from "@/lib/types";

export type EditorialGapScopeType = "city" | "neighborhood" | "group" | "fuel";
export type EditorialGapRecommendation = "vale pedir coleta já" | "pode esperar" | "precisa revisar base primeiro";

export interface EditorialGapItem {
  id: string;
  scopeType: EditorialGapScopeType;
  scopeLabel: string;
  city: string;
  neighborhood: string | null;
  groupName: string | null;
  fuelType: FuelType | null;
  score: number;
  recommendation: EditorialGapRecommendation;
  visibleStations: number;
  recentPriceStations: number;
  missingPriceStations: number;
  gapDensity: number;
  reasons: string[];
}

export interface EditorialGapInsightItem {
  label: string;
  count: number;
  note?: string | null;
}

export interface EditorialGapCityMovementItem {
  city: string;
  delta: number;
  recentCount: number;
  previousCount: number;
}

export interface EditorialGapDashboard {
  items: EditorialGapItem[];
  cityRows: EditorialGapItem[];
  neighborhoodRows: EditorialGapItem[];
  groupRows: EditorialGapItem[];
  fuelRows: EditorialGapItem[];
  repeatedFeedback: EditorialGapInsightItem[];
  topErrors: EditorialGapInsightItem[];
  improvedCities: EditorialGapCityMovementItem[];
  worsenedCities: EditorialGapCityMovementItem[];
  inviteTargets: Array<{ city: string; score: number; recommendation: EditorialGapRecommendation; reason: string }>;
  summary: {
    urgent: number;
    wait: number;
    review: number;
    topGapCount: number;
    copyText: string;
  };
}

const priorityCities = new Set(["Volta Redonda", "Barra Mansa", "Barra do Piraí"]);
const operationalFuelTypes: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getRecommendation(score: number, needsBaseReview: boolean): EditorialGapRecommendation {
  if (needsBaseReview) {
    return "precisa revisar base primeiro";
  }

  if (score >= 70) {
    return "vale pedir coleta já";
  }

  if (score >= 40) {
    return "pode esperar";
  }

  return "precisa revisar base primeiro";
}

function scoreGap(input: {
  visibleStations: number;
  recentPriceStations: number;
  recentReports: number;
  lowCoverageRows: number;
  geoReviewPenalty?: number;
  priorityBonus?: number;
  hardReview?: boolean;
}) {
  const missingPriceStations = Math.max(0, input.visibleStations - input.recentPriceStations);
  const gapDensity = input.visibleStations > 0 ? missingPriceStations / input.visibleStations : 1;
  const score = clamp(
    Math.round(
      missingPriceStations * 12 +
        gapDensity * 24 +
        Math.min(18, input.lowCoverageRows * 3) +
        Math.min(12, Math.max(0, 8 - input.recentReports)) * 2 +
        (input.geoReviewPenalty ?? 0) +
        (input.priorityBonus ?? 0)
    ),
    0,
    100
  );

  return {
    score,
    gapDensity,
    recommendation: getRecommendation(score, Boolean(input.hardReview))
  };
}

function buildCopyText(items: EditorialGapItem[], repeatedFeedback: EditorialGapInsightItem[], topErrors: EditorialGapInsightItem[], improvedCities: EditorialGapCityMovementItem[], worsenedCities: EditorialGapCityMovementItem[]) {
  const lines = [
    "Bomba Aberta · painel editorial de lacunas",
    "",
    `Top lacunas: ${items.slice(0, 3).map((item) => `${item.scopeLabel} (${item.score})`).join(" · ")}`,
    `Feedback repetido: ${repeatedFeedback.slice(0, 3).map((item) => `${item.label} (${item.count})`).join(" · ") || "sem destaque"}`,
    `Erros recorrentes: ${topErrors.slice(0, 3).map((item) => `${item.label} (${item.count})`).join(" · ") || "sem destaque"}`,
    `Melhoraram: ${improvedCities.slice(0, 3).map((item) => `${item.city} (+${item.delta})`).join(" · ") || "sem destaque"}`,
    `Pioraram: ${worsenedCities.slice(0, 3).map((item) => `${item.city} (${item.delta})`).join(" · ") || "sem destaque"}`
  ];

  return lines.join("\n");
}

function aggregateFeedback(input: Awaited<ReturnType<typeof getBetaFeedbackSummary>>) {
  const items = [
    ...input.byTopic.slice(0, 5).map((item) => ({ label: `Tema: ${item.triageTopic}`, count: item.count, note: "triagem" })),
    ...input.byScreen.slice(0, 5).map((item) => ({ label: `Tela: ${item.screenGroup}`, count: item.count, note: "recorrência" }))
  ];

  return items
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"))
    .slice(0, 5);
}

function aggregateErrors(input: Awaited<ReturnType<typeof getOperationalTelemetry>>) {
  const errorMap = new Map<string, number>();

  for (const event of input.recentEvents) {
    const isInteresting =
      event.severity === "error" ||
      event.severity === "warning" ||
      String(event.eventType).startsWith("upload_") ||
      String(event.eventType).startsWith("submission_") ||
      String(event.eventType).startsWith("auth_") ||
      String(event.eventType).startsWith("cron_");
    if (!isInteresting) continue;

    const label = event.reason?.trim() || event.eventType;
    errorMap.set(label, (errorMap.get(label) ?? 0) + 1);
  }

  return Array.from(errorMap.entries())
    .map(([label, count]) => ({ label, count, note: label.startsWith("upload_") ? "upload" : "operacional" }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"))
    .slice(0, 5);
}

function buildCityGaps(stations: Station[], reports: Awaited<ReturnType<typeof getApprovedReportsSince>>, dashboardRows: Awaited<ReturnType<typeof getOperationalDashboard>>["coverageRows"]) {
  const recentStationByCity = new Map<string, Set<string>>();
  const visibleByCity = new Map<string, Station[]>();
  const recentByCity = new Map<string, number>();

  for (const station of stations) {
    const list = visibleByCity.get(station.city) ?? [];
    list.push(station);
    visibleByCity.set(station.city, list);
  }

  for (const report of reports) {
    const station = stations.find((item) => item.id === report.stationId);
    if (!station) continue;
    const set = recentStationByCity.get(station.city) ?? new Set<string>();
    set.add(station.id);
    recentStationByCity.set(station.city, set);
    recentByCity.set(station.city, (recentByCity.get(station.city) ?? 0) + 1);
  }

  const lowCoverageByCity = new Map<string, number>();
  for (const row of dashboardRows) {
    if (row.coverageRatio < 0.45) {
      lowCoverageByCity.set(row.city, (lowCoverageByCity.get(row.city) ?? 0) + 1);
    }
  }

  return Array.from(visibleByCity.entries())
    .map(([city, cityStations]) => {
      const visibleStations = cityStations.length;
      const recentPriceStations = recentStationByCity.get(city)?.size ?? 0;
      const lowCoverageRows = lowCoverageByCity.get(city) ?? 0;
      const priorityBonus = priorityCities.has(city) ? 12 : 0;
      const hardReview = visibleStations < 3 || recentPriceStations === 0;
      const { score, gapDensity, recommendation } = scoreGap({
        visibleStations,
        recentPriceStations,
        recentReports: recentByCity.get(city) ?? 0,
        lowCoverageRows,
        geoReviewPenalty: cityStations.filter((station) => station.geoReviewStatus !== "ok").length * 3,
        priorityBonus,
        hardReview
      });

      const missingPriceStations = Math.max(0, visibleStations - recentPriceStations);
      const reasons = [
        `${missingPriceStations} postos sem preço recente`,
        lowCoverageRows > 0 ? `${lowCoverageRows} recortes com cobertura fraca` : null,
        cityStations.filter((station) => station.geoReviewStatus !== "ok").length > 0 ? "geografia ainda em revisão" : null
      ].filter((value): value is string => Boolean(value));

      return {
        id: `city:${normalizeKey(city)}`,
        scopeType: "city" as const,
        scopeLabel: city,
        city,
        neighborhood: null,
        groupName: null,
        fuelType: null,
        score,
        recommendation,
        visibleStations,
        recentPriceStations,
        missingPriceStations,
        gapDensity,
        reasons
      } satisfies EditorialGapItem;
    })
    .sort((left, right) => right.score - left.score || left.city.localeCompare(right.city, "pt-BR"));
}

function buildNeighborhoodGaps(stations: Station[], reports: Awaited<ReturnType<typeof getApprovedReportsSince>>) {
  const recentStationIds = new Set<string>();
  for (const report of reports) {
    recentStationIds.add(report.stationId);
  }

  const byNeighborhood = new Map<string, Station[]>();
  for (const station of stations) {
    const neighborhood = station.neighborhood?.trim() || "Sem bairro informado";
    const key = `${station.city}::${neighborhood}`;
    const list = byNeighborhood.get(key) ?? [];
    list.push(station);
    byNeighborhood.set(key, list);
  }

  return Array.from(byNeighborhood.entries())
    .map(([key, neighborhoodStations]) => {
      const [city, neighborhood] = key.split("::");
      const visibleStations = neighborhoodStations.length;
      const recentPriceStations = neighborhoodStations.filter((station) => recentStationIds.has(station.id)).length;
      const missingPriceStations = Math.max(0, visibleStations - recentPriceStations);
      const lowReviewCount = neighborhoodStations.filter((station) => station.geoReviewStatus !== "ok").length;
      const { score, gapDensity, recommendation } = scoreGap({
        visibleStations,
        recentPriceStations,
        recentReports: recentPriceStations,
        lowCoverageRows: lowReviewCount,
        geoReviewPenalty: lowReviewCount * 2,
        hardReview: visibleStations < 2 || recentPriceStations === 0
      });

      return {
        id: `neighborhood:${normalizeKey(city)}:${normalizeKey(neighborhood)}`,
        scopeType: "neighborhood" as const,
        scopeLabel: neighborhood,
        city,
        neighborhood,
        groupName: null,
        fuelType: null,
        score,
        recommendation,
        visibleStations,
        recentPriceStations,
        missingPriceStations,
        gapDensity,
        reasons: [
          `${visibleStations} postos no bairro`,
          `${missingPriceStations} sem preço recente`,
          lowReviewCount > 0 ? `${lowReviewCount} em revisão territorial` : null
        ].filter((value): value is string => Boolean(value))
      } satisfies EditorialGapItem;
    })
    .filter((item) => item.visibleStations > 0)
    .sort((left, right) => right.score - left.score || left.city.localeCompare(right.city, "pt-BR") || left.scopeLabel.localeCompare(right.scopeLabel, "pt-BR"));
}

function buildGroupGaps(stations: Station[], reports: Awaited<ReturnType<typeof getApprovedReportsSince>>, groups: Awaited<ReturnType<typeof getAuditGroups>>, membersByGroupId: Map<string, Awaited<ReturnType<typeof getAuditGroupMembers>>>) {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const recentStationIds = new Set(reports.map((report) => report.stationId));

  return groups
    .map((group) => {
      const members = membersByGroupId.get(group.id) ?? [];
      const memberStations = members.map((member) => stationById.get(member.stationId)).filter((item): item is Station => Boolean(item));
      const visibleStations = memberStations.length;
      let groupRecentStations = 0;

      for (const station of memberStations) {
        if (recentStationIds.has(station.id)) {
          groupRecentStations += 1;
        }
      }

      const missingPriceStations = Math.max(0, visibleStations - groupRecentStations);
      const lowReviewCount = memberStations.filter((station) => station.geoReviewStatus !== "ok").length;
      const { score, gapDensity, recommendation } = scoreGap({
        visibleStations,
        recentPriceStations: groupRecentStations,
        recentReports: groupRecentStations,
        lowCoverageRows: lowReviewCount,
        geoReviewPenalty: group.groupType === "corredor" ? 2 : 0,
        priorityBonus: group.city && priorityCities.has(group.city) ? 10 : 0,
        hardReview: visibleStations === 0 || groupRecentStations === 0
      });

      return {
        id: `group:${group.slug}`,
        scopeType: "group" as const,
        scopeLabel: group.name,
        city: group.city ?? "Sem cidade",
        neighborhood: null,
        groupName: group.name,
        fuelType: null,
        score,
        recommendation,
        visibleStations,
        recentPriceStations: groupRecentStations,
        missingPriceStations,
        gapDensity,
        reasons: [
          visibleStations > 0 ? `${visibleStations} postos no grupo` : "grupo vazio",
          `${missingPriceStations} sem preço recente`,
          lowReviewCount > 0 ? `${lowReviewCount} em revisão territorial` : null
        ].filter((value): value is string => Boolean(value))
      } satisfies EditorialGapItem;
    })
    .sort((left, right) => right.score - left.score || left.scopeLabel.localeCompare(right.scopeLabel, "pt-BR"));
}

function buildFuelGaps(stations: Station[], reports: Awaited<ReturnType<typeof getApprovedReportsSince>>) {
  const stationsByFuel = new Map<FuelType, Set<string>>();

  for (const fuelType of operationalFuelTypes) {
    stationsByFuel.set(fuelType, new Set<string>());
  }

  for (const report of reports) {
    const bucket = stationsByFuel.get(report.fuelType);
    if (!bucket) continue;
    bucket.add(report.stationId);
  }

  return operationalFuelTypes
    .map((fuelType) => {
      const recentPriceStations = stationsByFuel.get(fuelType)?.size ?? 0;
      const visibleStations = stations.length;
      const missingPriceStations = Math.max(0, visibleStations - recentPriceStations);
      const hardReview = visibleStations > 0 && recentPriceStations === 0;
      const { score, gapDensity, recommendation } = scoreGap({
        visibleStations,
        recentPriceStations,
        recentReports: recentPriceStations,
        lowCoverageRows: missingPriceStations > 0 ? 1 : 0,
        priorityBonus: fuelType === "gasolina_comum" ? 8 : 0,
        hardReview
      });

      return {
        id: `fuel:${fuelType}`,
        scopeType: "fuel" as const,
        scopeLabel: fuelLabels[fuelType],
        city: "Regional",
        neighborhood: null,
        groupName: null,
        fuelType,
        score,
        recommendation,
        visibleStations,
        recentPriceStations,
        missingPriceStations,
        gapDensity,
        reasons: [
          `${missingPriceStations} postos sem leitura recente`,
          recentPriceStations > 0 ? `${recentPriceStations} com preço recente` : "sem leitura recente"
        ]
      } satisfies EditorialGapItem;
    })
    .sort((left, right) => right.score - left.score || left.scopeLabel.localeCompare(right.scopeLabel, "pt-BR"));
}

function buildCityMovement(reports: Awaited<ReturnType<typeof getApprovedReportsSince>>, stations: Station[]) {
  const byCityRecent = new Map<string, number>();
  const byCityPrevious = new Map<string, number>();
  const now = Date.now();

  for (const report of reports) {
    const station = stations.find((item) => item.id === report.stationId);
    if (!station) continue;
    const ageDays = (now - new Date(report.reportedAt).getTime()) / 86_400_000;
    if (ageDays <= 7) {
      byCityRecent.set(station.city, (byCityRecent.get(station.city) ?? 0) + 1);
    } else if (ageDays <= 14) {
      byCityPrevious.set(station.city, (byCityPrevious.get(station.city) ?? 0) + 1);
    }
  }

  const rows = Array.from(new Set([...byCityRecent.keys(), ...byCityPrevious.keys()]))
    .map((city) => ({
      city,
      recentCount: byCityRecent.get(city) ?? 0,
      previousCount: byCityPrevious.get(city) ?? 0,
      delta: (byCityRecent.get(city) ?? 0) - (byCityPrevious.get(city) ?? 0)
    }))
    .sort((left, right) => right.delta - left.delta || right.recentCount - left.recentCount || left.city.localeCompare(right.city, "pt-BR"));

  return {
    improvedCities: rows.filter((row) => row.delta > 0).slice(0, 3),
    worsenedCities: rows.filter((row) => row.delta < 0).sort((left, right) => left.delta - right.delta).slice(0, 3)
  };
}

export async function getEditorialGapDashboard(days = 14): Promise<EditorialGapDashboard> {
  const [stations, reports, feedback, telemetry, dashboard, groups] = await Promise.all([
    getActiveStations(),
    getApprovedReportsSince(Math.max(14, days), 5000),
    getBetaFeedbackSummary(days),
    getOperationalTelemetry(7),
    getOperationalDashboard(days),
    getAuditGroups()
  ]);

  const membersByGroupId = new Map<string, Awaited<ReturnType<typeof getAuditGroupMembers>>>();
  await Promise.all(
    groups.map(async (group) => {
      membersByGroupId.set(group.id, await getAuditGroupMembers(group.id));
    })
  );

  const cityRows = buildCityGaps(stations, reports, dashboard.coverageRows).slice(0, 6);
  const neighborhoodRows = buildNeighborhoodGaps(stations, reports).slice(0, 6);
  const groupRows = buildGroupGaps(stations, reports, groups, membersByGroupId).slice(0, 6);
  const fuelRows = buildFuelGaps(stations, reports).slice(0, 6);
  const repeatedFeedback = aggregateFeedback(feedback);
  const topErrors = aggregateErrors(telemetry);
  const { improvedCities, worsenedCities } = buildCityMovement(reports, stations);

  const items = [...cityRows, ...neighborhoodRows, ...groupRows, ...fuelRows]
    .sort((left, right) => right.score - left.score || left.scopeType.localeCompare(right.scopeType) || left.scopeLabel.localeCompare(right.scopeLabel, "pt-BR"))
    .slice(0, 10);

  const inviteTargets = cityRows
    .filter((row) => row.recommendation === "vale pedir coleta já")
    .slice(0, 3)
    .map((row) => ({ city: row.city, score: row.score, recommendation: row.recommendation, reason: row.reasons[0] ?? "lacuna alta" }));

  const summary = {
    urgent: items.filter((item) => item.recommendation === "vale pedir coleta já").length,
    wait: items.filter((item) => item.recommendation === "pode esperar").length,
    review: items.filter((item) => item.recommendation === "precisa revisar base primeiro").length,
    topGapCount: items.length,
    copyText: buildCopyText(items, repeatedFeedback, topErrors, improvedCities, worsenedCities)
  };

  return {
    items,
    cityRows,
    neighborhoodRows,
    groupRows,
    fuelRows,
    repeatedFeedback,
    topErrors,
    improvedCities,
    worsenedCities,
    inviteTargets,
    summary
  };
}

export function buildEditorialGapCsvRows(data: EditorialGapDashboard) {
  return [
    ...data.items.map((item) => ({
      section: "gap",
      scope_type: item.scopeType,
      scope_label: item.scopeLabel,
      city: item.city,
      neighborhood: item.neighborhood ?? "",
      group_name: item.groupName ?? "",
      fuel_type: item.fuelType ?? "",
      score: item.score,
      recommendation: item.recommendation,
      visible_stations: item.visibleStations,
      recent_price_stations: item.recentPriceStations,
      missing_price_stations: item.missingPriceStations,
      gap_density: item.gapDensity.toFixed(2),
      reasons: item.reasons.join(" | ")
    })),
    ...data.repeatedFeedback.map((item) => ({
      section: "feedback",
      scope_type: "feedback",
      scope_label: item.label,
      city: "",
      neighborhood: "",
      group_name: "",
      fuel_type: "",
      score: item.count,
      recommendation: "",
      visible_stations: "",
      recent_price_stations: "",
      missing_price_stations: "",
      gap_density: "",
      reasons: item.note ?? ""
    })),
    ...data.topErrors.map((item) => ({
      section: "error",
      scope_type: "error",
      scope_label: item.label,
      city: "",
      neighborhood: "",
      group_name: "",
      fuel_type: "",
      score: item.count,
      recommendation: "",
      visible_stations: "",
      recent_price_stations: "",
      missing_price_stations: "",
      gap_density: "",
      reasons: item.note ?? ""
    }))
  ];
}

