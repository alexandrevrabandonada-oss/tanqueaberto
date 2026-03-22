import { getActiveStations, getApprovedReportsSince } from "@/lib/data/queries";
import type { OpsPriorityTarget } from "./types";

export async function getPriorityTargets(limit = 12): Promise<OpsPriorityTarget[]> {
  const [stations, reports] = await Promise.all([getActiveStations(), getApprovedReportsSince(30, 4000)]);
  const recentByStation = new Map<string, number>();
  const lastReportedByStation = new Map<string, string>();

  for (const report of reports) {
    recentByStation.set(report.stationId, (recentByStation.get(report.stationId) ?? 0) + 1);
    const current = lastReportedByStation.get(report.stationId);
    if (!current || new Date(report.reportedAt).getTime() > new Date(current).getTime()) {
      lastReportedByStation.set(report.stationId, report.reportedAt);
    }
  }

  return stations
    .map((station) => {
      const recentObservations = recentByStation.get(station.id) ?? 0;
      const lastReportedAt = lastReportedByStation.get(station.id) ?? null;
      const daysSince = lastReportedAt ? (Date.now() - new Date(lastReportedAt).getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;
      const geoPenalty = station.geoReviewStatus === "ok" ? 0 : station.geoReviewStatus === "pending" ? 10 : 18;
      const freshnessPenalty = daysSince === Number.POSITIVE_INFINITY ? 20 : daysSince >= 30 ? 16 : daysSince >= 14 ? 10 : daysSince >= 7 ? 6 : 2;
      const massPenalty = recentObservations === 0 ? 22 : recentObservations < 3 ? 14 : recentObservations < 8 ? 8 : 2;
      const priorityScore = (station.priorityScore ?? 0) + geoPenalty + freshnessPenalty + massPenalty;

      return {
        stationId: station.id,
        stationName: station.namePublic ?? station.name,
        city: station.city,
        neighborhood: station.neighborhood ?? null,
        geoReviewStatus: station.geoReviewStatus ?? null,
        geoConfidence: station.geoConfidence ?? null,
        priorityScore,
        recentObservations,
        lastReportedAt,
        reason:
          recentObservations === 0
            ? "sem leitura recente"
            : daysSince >= 30
              ? "histórico antigo"
              : station.geoReviewStatus !== "ok"
                ? "geografia em revisão"
                : "densificar histórico"
      } satisfies OpsPriorityTarget;
    })
    .sort((left, right) => right.priorityScore - left.priorityScore || left.city.localeCompare(right.city))
    .slice(0, limit);
}
