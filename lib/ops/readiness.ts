import { auditCities, getAuditCitySlug } from "@/lib/audit/cities";
import { getAuditGroups, getAuditGroupMembers } from "@/lib/audit/groups";
import { getApprovedReportsSince, getActiveStations } from "@/lib/data/queries";
import { getBetaFeedbackSummary } from "@/lib/beta/feedback";
import { getOperationalTelemetry } from "@/lib/ops/observability";
import { getOperationalDashboard } from "@/lib/ops/reports";
import type { CityReadinessRecommendation, CityReadinessRow, CityReadinessTrafficLight, GroupReadinessRow } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readScoreBucket(score: number): CityReadinessTrafficLight {
  if (score >= 70) return "green";
  if (score >= 45) return "yellow";
  return "red";
}

function readRecommendation(score: number, visibleStations: number, stationsWithRecentPrice: number, recentReports: number, negativeFeedback: number, uploadErrors: number): CityReadinessRecommendation {
  if (visibleStations < 5 || stationsWithRecentPrice < 3 || recentReports < 6) {
    return "segurar";
  }

  if (score >= 70 && negativeFeedback <= 3 && uploadErrors <= 2) {
    return "pronta para ampliar";
  }

  return "testar pequeno";
}

function readGroupRecommendation(
  score: number,
  visibleStations: number,
  stationsWithRecentPrice: number,
  recentReports: number,
  negativeFeedback: number,
  uploadErrors: number
): CityReadinessRecommendation {
  if (uploadErrors > 3 || negativeFeedback > 5) {
    return "revisar cadastro antes";
  }

  if (visibleStations < 3 || stationsWithRecentPrice < 2 || recentReports < 4) {
    return "segurar e densificar base";
  }

  if (score >= 75 && negativeFeedback <= 2 && uploadErrors <= 1) {
    return "pronto para teste na rua";
  }

  if (score >= 50) {
    return "testar com 2 ou 3 pessoas";
  }

  return "segurar e densificar base";
}

function getCityCoverageScore(city: string, coverageRows: Array<{ city: string; coverageRatio: number }>) {
  const rows = coverageRows.filter((row) => row.city.localeCompare(city, "pt-BR", { sensitivity: "base" }) === 0);
  const weakRows = rows.filter((row) => row.coverageRatio < 0.35).length;
  const lowRows = rows.filter((row) => row.coverageRatio < 0.45).length;
  return { total: rows.length, weakRows, lowRows };
}

export async function getCityReadinessRows(days = 30): Promise<CityReadinessRow[]> {
  const [stations, reports, feedbackSummary, telemetry, dashboard] = await Promise.all([
    getActiveStations(),
    getApprovedReportsSince(days, 5000),
    getBetaFeedbackSummary(days),
    getOperationalTelemetry(7),
    getOperationalDashboard(days)
  ]);

  const cityNames = Array.from(new Set([...auditCities.map((city) => city.name), ...stations.map((station) => station.city)])).sort((left, right) => left.localeCompare(right, "pt-BR"));
  const stationCountByCity = new Map<string, number>();
  const recentStationsWithPriceByCity = new Map<string, Set<string>>();
  const recentReportsByCity = new Map<string, number>();
  const negativeFeedbackByCity = new Map<string, number>();
  const uploadErrorsByCity = new Map<string, number>();

  for (const station of stations) {
    stationCountByCity.set(station.city, (stationCountByCity.get(station.city) ?? 0) + 1);
  }

  for (const report of reports) {
    const station = stations.find((item) => item.id === report.stationId);
    if (!station) continue;
    recentReportsByCity.set(station.city, (recentReportsByCity.get(station.city) ?? 0) + 1);
    const set = recentStationsWithPriceByCity.get(station.city) ?? new Set<string>();
    set.add(station.id);
    recentStationsWithPriceByCity.set(station.city, set);
  }

  for (const item of feedbackSummary.recent) {
    if (!item.city) continue;
    if (item.feedbackType === "problema" || item.feedbackType === "confusa" || item.triagePriority === "alta") {
      negativeFeedbackByCity.set(item.city, (negativeFeedbackByCity.get(item.city) ?? 0) + 1);
    }
  }

  for (const event of telemetry.recentEvents) {
    if (!event.city) continue;
    if (String(event.eventType).startsWith("upload_") || event.eventType === "submission_failed") {
      uploadErrorsByCity.set(event.city, (uploadErrorsByCity.get(event.city) ?? 0) + 1);
    }
  }

  return cityNames
    .map((city) => {
      const visibleStations = stationCountByCity.get(city) ?? 0;
      const stationsWithRecentPrice = recentStationsWithPriceByCity.get(city)?.size ?? 0;
      const approvedReportsRecent = recentReportsByCity.get(city) ?? 0;
      const negativeFeedback = negativeFeedbackByCity.get(city) ?? 0;
      const uploadErrors = uploadErrorsByCity.get(city) ?? 0;
      const coverage = getCityCoverageScore(city, dashboard.coverageRows);
      const gapDensity = coverage.total === 0 ? 1 : clamp(coverage.weakRows / coverage.total, 0, 1);

      const score = clamp(
        Math.min(25, visibleStations * 3) +
          Math.min(30, stationsWithRecentPrice * 5) +
          Math.min(15, Math.round(approvedReportsRecent / 2)) -
          Math.min(15, negativeFeedback * 3) -
          Math.min(15, uploadErrors * 4) -
          Math.min(20, Math.round(gapDensity * 20)),
        0,
        100
      );

      const recommendation = readRecommendation(score, visibleStations, stationsWithRecentPrice, approvedReportsRecent, negativeFeedback, uploadErrors);
      const trafficLight = readScoreBucket(score);

      const gaps: string[] = [];
      if (visibleStations < 5) gaps.push(`${visibleStations} postos visíveis`);
      if (stationsWithRecentPrice < 3) gaps.push(`${stationsWithRecentPrice} postos com preço recente`);
      if (approvedReportsRecent < 6) gaps.push(`${approvedReportsRecent} reports recentes`);
      if (negativeFeedback > 0) gaps.push(`${negativeFeedback} feedbacks negativos`);
      if (uploadErrors > 0) gaps.push(`${uploadErrors} erros de envio`);
      if (coverage.weakRows > 0) gaps.push(`${coverage.weakRows} recortes com cobertura fraca`);

      return {
        city,
        citySlug: getAuditCitySlug(city),
        score,
        trafficLight,
        recommendation,
        visibleStations,
        stationsWithRecentPrice,
        approvedReportsRecent,
        negativeFeedback,
        uploadErrors,
        weakCoverageRows: coverage.weakRows,
        lowCoverageRows: coverage.lowRows,
        gapDensity,
        gaps: gaps.slice(0, 4)
      } satisfies CityReadinessRow;
    })
    .sort((left, right) => right.score - left.score || left.city.localeCompare(right.city, "pt-BR"));
}
export async function getGroupReadinessRows(days = 30): Promise<GroupReadinessRow[]> {
  const [stations, reports, feedbackSummary, telemetry, dashboard, groups] = await Promise.all([
    getActiveStations(),
    getApprovedReportsSince(days, 5000),
    getBetaFeedbackSummary(days),
    getOperationalTelemetry(7),
    getOperationalDashboard(days),
    getAuditGroups()
  ]);

  const groupMembershipsPromises = groups.map((g) => getAuditGroupMembers(g.id));
  const groupMembershipsResults = await Promise.all(groupMembershipsPromises);
  const groupToStations = new Map<string, string[]>();

  groups.forEach((group, index) => {
    groupToStations.set(
      group.id,
      groupMembershipsResults[index].map((m) => m.stationId)
    );
  });

  const stationToGroups = new Map<string, string[]>();
  groupToStations.forEach((stationIds, groupId) => {
    stationIds.forEach((sid) => {
      const gids = stationToGroups.get(sid) ?? [];
      gids.push(groupId);
      stationToGroups.set(sid, gids);
    });
  });

  const recentStationsWithPrice = new Set<string>();
  const recentReportsByStation = new Map<string, number>();
  const negativeFeedbackByStation = new Map<string, number>();
  const uploadErrorsByStation = new Map<string, number>();

  for (const report of reports) {
    recentReportsByStation.set(report.stationId, (recentReportsByStation.get(report.stationId) ?? 0) + 1);
    recentStationsWithPrice.add(report.stationId);
  }

  for (const item of feedbackSummary.recent) {
    if (!item.stationId) continue;
    if (item.feedbackType === "problema" || item.feedbackType === "confusa" || item.triagePriority === "alta") {
      negativeFeedbackByStation.set(item.stationId, (negativeFeedbackByStation.get(item.stationId) ?? 0) + 1);
    }
  }

  for (const event of telemetry.recentEvents) {
    if (!event.stationId) continue;
    if (String(event.eventType).startsWith("upload_") || event.eventType === "submission_failed") {
      uploadErrorsByStation.set(event.stationId, (uploadErrorsByStation.get(event.stationId) ?? 0) + 1);
    }
  }

  return groups
    .map((group) => {
      const stationIds = groupToStations.get(group.id) ?? [];
      const visibleStations = stationIds.length;

      let stationsWithRecentPrice = 0;
      let approvedReportsRecent = 0;
      let negativeFeedback = 0;
      let uploadErrors = 0;

      for (const sid of stationIds) {
        if (recentStationsWithPrice.has(sid)) stationsWithRecentPrice++;
        approvedReportsRecent += recentReportsByStation.get(sid) ?? 0;
        negativeFeedback += negativeFeedbackByStation.get(sid) ?? 0;
        uploadErrors += uploadErrorsByStation.get(sid) ?? 0;
      }

      // Coverage per group is approximated or we can try to find matches in dashboard.coverageRows
      // For now, let's use a simpler density if not directly available
      const gapDensity = visibleStations === 0 ? 1 : clamp((visibleStations - stationsWithRecentPrice) / visibleStations, 0, 1);

      const score = clamp(
        Math.min(25, visibleStations * 5) +
          Math.min(30, stationsWithRecentPrice * 8) +
          Math.min(15, Math.round(approvedReportsRecent / 1.5)) -
          Math.min(15, negativeFeedback * 4) -
          Math.min(15, uploadErrors * 5) -
          Math.min(20, Math.round(gapDensity * 20)),
        0,
        100
      );

      const recommendation = readGroupRecommendation(score, visibleStations, stationsWithRecentPrice, approvedReportsRecent, negativeFeedback, uploadErrors);
      const trafficLight = readScoreBucket(score);

      const gaps: string[] = [];
      if (visibleStations < 3) gaps.push(`${visibleStations} postos visíveis`);
      if (stationsWithRecentPrice < 2) gaps.push(`${stationsWithRecentPrice} postos com preço recente`);
      if (approvedReportsRecent < 4) gaps.push(`${approvedReportsRecent} reports recentes`);
      if (negativeFeedback > 1) gaps.push(`${negativeFeedback} feedbacks negativos`);
      if (uploadErrors > 1) gaps.push(`${uploadErrors} erros de envio`);

      return {
        groupId: group.id,
        groupName: group.name,
        groupSlug: group.slug,
        groupType: group.groupType,
        city: group.city,
        score,
        trafficLight,
        recommendation,
        visibleStations,
        stationsWithRecentPrice,
        approvedReportsRecent,
        negativeFeedback,
        uploadErrors,
        weakCoverageRows: 0, // Placeholder as we don't have direct group coverage mapping yet
        lowCoverageRows: 0,
        gapDensity,
        gaps: gaps.slice(0, 4)
      } satisfies GroupReadinessRow;
    })
    .sort((left, right) => right.score - left.score || left.groupName.localeCompare(right.groupName, "pt-BR"));
}
