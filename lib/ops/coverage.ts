import { auditCities, getAuditCitySlug } from "@/lib/audit/cities";
import { getCityAuditDetail } from "@/lib/audit/queries";
import type { FuelType } from "@/lib/types";
import { getActiveStations, getApprovedReportsSince } from "@/lib/data/queries";
import type { OpsCoverageCityFuelRow } from "./types";

const operationalFuelTypes: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

export async function getOperationalCoverageRows(days = 30): Promise<OpsCoverageCityFuelRow[]> {
  const rows: OpsCoverageCityFuelRow[] = [];

  for (const city of auditCities) {
    for (const fuelType of operationalFuelTypes) {
      const detail = await getCityAuditDetail(city.slug, fuelType, days as 7 | 30 | 90);
      if (!detail) {
        continue;
      }

      rows.push({
        city: detail.city,
        citySlug: detail.citySlug,
        fuelType,
        days,
        stations: detail.summary.stations,
        observations: detail.summary.observations,
        coverageRatio: detail.summary.coverageRatio,
        coverageLabel: detail.summary.coverageLabel,
        confidenceLabel: detail.summary.confidenceLabel,
        lastReportedAt: detail.summary.latestPrice !== null ? detail.series.slice().reverse().find((point) => point.latestReportedAt)?.latestReportedAt ?? null : null,
        trend: detail.summary.trend
      });
    }
  }

  return rows.sort((left, right) => left.city.localeCompare(right.city) || left.fuelType.localeCompare(right.fuelType));
}

export async function getCoverageSignals(days = 30) {
  const [stations, reports] = await Promise.all([getActiveStations(), getApprovedReportsSince(days, 4000)]);
  const coverageRows = await getOperationalCoverageRows(days);

  const recentByStation = new Map<string, number>();
  const lastReportedByStation = new Map<string, string>();
  for (const report of reports) {
    recentByStation.set(report.stationId, (recentByStation.get(report.stationId) ?? 0) + 1);
    const current = lastReportedByStation.get(report.stationId);
    if (!current || new Date(report.reportedAt).getTime() > new Date(current).getTime()) {
      lastReportedByStation.set(report.stationId, report.reportedAt);
    }
  }

  const lowCoverageCities = coverageRows.filter((row) => row.coverageRatio < 0.35 || row.observations < 5);
  const staleStations = stations
    .map((station) => {
      const lastReportedAt = lastReportedByStation.get(station.id) ?? null;
      const recentObservations = recentByStation.get(station.id) ?? 0;
      const daysSince = lastReportedAt ? (Date.now() - new Date(lastReportedAt).getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;

      return {
        stationId: station.id,
        stationName: station.name,
        city: station.city,
        neighborhood: station.neighborhood,
        geoReviewStatus: station.geoReviewStatus,
        geoConfidence: station.geoConfidence,
        priorityScore: station.priorityScore ?? 0,
        recentObservations,
        lastReportedAt,
        daysSince,
        reason: recentObservations === 0 ? "sem leitura recente" : daysSince >= 30 ? "leitura antiga" : "cobertura baixa"
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore || right.daysSince - left.daysSince || left.city.localeCompare(right.city));

  const lowCoverageFuels = coverageRows.reduce<Record<FuelType, number>>((acc, row) => {
    if (row.coverageRatio < 0.4) {
      acc[row.fuelType as FuelType] = (acc[row.fuelType as FuelType] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<FuelType, number>);

  const citiesCovered = new Set(coverageRows.map((row) => row.citySlug)).size;
  const recentObservations = reports.length;

  return {
    coverageRows,
    lowCoverageCities,
    staleStations,
    lowCoverageFuels,
    citiesCovered,
    recentObservations
  };
}

export function getCoveragePressureLabel(row: OpsCoverageCityFuelRow) {
  if (row.coverageRatio >= 0.7) return "forte";
  if (row.coverageRatio >= 0.4) return "média";
  return "fraca";
}

export function getCoverageCitySlug(city: string) {
  return getAuditCitySlug(city);
}
