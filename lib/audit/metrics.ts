import type { FuelType, PriceReport, Station } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import type { AuditAlert, AuditCitySummaryItem, AuditOverview, AuditSeriesPoint, AuditSeverity, AuditStationSummaryItem, AuditSummary, AuditWindowDays } from "@/lib/audit/types";
import { buildSeriesFromReports, summarizeAuditSeries } from "@/lib/audit/series";

export function getBrazilDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function formatBrazilDayLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

export function buildDailySeries(reports: PriceReport[], days: AuditWindowDays): AuditSeriesPoint[] {
  return buildSeriesFromReports(reports, days);
}

export function summarizeReports(reports: PriceReport[], stationCount = 0, cityCount = 0, days: AuditWindowDays = 30): AuditSummary {
  return summarizeAuditSeries(buildDailySeries(reports, days), stationCount, cityCount, days);
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}


function severityFromChange(change: number): AuditSeverity {
  const absolute = Math.abs(change);
  if (absolute >= 10) return "high";
  if (absolute >= 5) return "medium";
  return "low";
}

function buildStationSummaryItem(station: Station, stationReports: PriceReport[], days: AuditWindowDays): AuditStationSummaryItem {
  const series = buildDailySeries(stationReports, days);
  const summary = summarizeAuditSeries(series, 1, 1, days);

  return {
    stationId: station.id,
    stationName: station.name,
    city: station.city,
    observations: summary.observations,
    medianPrice: summary.medianPrice,
    lastReportedAt: stationReports.slice().sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime())[0]?.reportedAt ?? null,
    coverageRatio: summary.coverageRatio,
    coverageLabel: summary.coverageLabel,
    confidenceLabel: summary.confidenceLabel,
    trend: summary.trend
  };
}

export function buildStationSummaries(reports: PriceReport[], stations: Station[], days: AuditWindowDays = 30): AuditStationSummaryItem[] {
  const byStation = new Map<string, PriceReport[]>();

  for (const report of reports) {
    const list = byStation.get(report.stationId) ?? [];
    list.push(report);
    byStation.set(report.stationId, list);
  }

  return stations
    .map((station) => buildStationSummaryItem(station, byStation.get(station.id) ?? [], days))
    .filter((item) => item.observations > 0)
    .sort((left, right) => right.observations - left.observations || right.coverageRatio - left.coverageRatio || (left.medianPrice ?? Infinity) - (right.medianPrice ?? Infinity));
}

export function buildCitySummaries(reports: PriceReport[], stations: Station[], days: AuditWindowDays = 30): AuditCitySummaryItem[] {
  const stationsByCity = new Map<string, Station[]>();
  for (const station of stations) {
    const list = stationsByCity.get(station.city) ?? [];
    list.push(station);
    stationsByCity.set(station.city, list);
  }

  const byCity = new Map<string, PriceReport[]>();
  for (const report of reports) {
    const station = stations.find((item) => item.id === report.stationId);
    if (!station) continue;
    const list = byCity.get(station.city) ?? [];
    list.push(report);
    byCity.set(station.city, list);
  }

  return Array.from(byCity.entries())
    .map(([city, cityReports]) => {
      const series = buildDailySeries(cityReports, days);
      const summary = summarizeAuditSeries(series, stationsByCity.get(city)?.length ?? 0, 1, days);
      return {
        city,
        observations: summary.observations,
        medianPrice: summary.medianPrice,
        lastReportedAt: cityReports.slice().sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime())[0]?.reportedAt ?? null,
        coverageRatio: summary.coverageRatio,
        coverageLabel: summary.coverageLabel,
        confidenceLabel: summary.confidenceLabel,
        trend: summary.trend
      } satisfies AuditCitySummaryItem;
    })
    .sort((left, right) => right.observations - left.observations || right.coverageRatio - left.coverageRatio || left.city.localeCompare(right.city));
}

function percentChange(previous: number, current: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildAlerts(reports: PriceReport[], stations: Station[], fuelType: FuelType): AuditAlert[] {
  const alerts: AuditAlert[] = [];
  const byStation = new Map<string, PriceReport[]>();
  const byCity = new Map<string, PriceReport[]>();

  for (const report of reports) {
    const station = stations.find((item) => item.id === report.stationId);
    if (!station) continue;

    const stationList = byStation.get(station.id) ?? [];
    stationList.push(report);
    byStation.set(station.id, stationList);

    const cityList = byCity.get(station.city) ?? [];
    cityList.push(report);
    byCity.set(station.city, cityList);
  }

  for (const [stationId, stationReports] of byStation.entries()) {
    const station = stations.find((item) => item.id === stationId);
    if (!station || stationReports.length < 3) continue;

    const sorted = [...stationReports].sort((left, right) => new Date(left.reportedAt).getTime() - new Date(right.reportedAt).getTime());
    const latest = sorted.at(-1);
    const previous = sorted.at(-2);
    if (!latest || !previous) continue;

    const change = percentChange(previous.price, latest.price);
    if (change === null || Math.abs(change) < 5) continue;

    alerts.push({
      kind: change > 0 ? "sharp_rise" : "sharp_fall",
      title: change > 0 ? `Alta brusca em ${station.name}` : `Queda brusca em ${station.name}`,
      description: `${station.city} · ${fuelLabels[fuelType]} · variação de ${change.toFixed(1)}% entre as últimas duas leituras.`,
      severity: severityFromChange(change),
      fuelType,
      city: station.city,
      stationId: station.id,
      stationName: station.name,
      value: change
    });
  }

  for (const [city, cityReports] of byCity.entries()) {
    if (cityReports.length < 6) continue;
    const sorted = [...cityReports].sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime());
    const latest = sorted.slice(0, 4);
    const prices = latest.map((report) => report.price);
    const spread = Math.max(...prices) - Math.min(...prices);

    if (spread <= 0.15 && latest.length >= 3) {
      alerts.push({
        kind: "synchronized_move",
        title: `Movimento sincronizado em ${city}`,
        description: `As últimas leituras de ${fuelLabels[fuelType]} ficaram muito próximas entre si. Isso merece acompanhamento, não conclusão.`,
        severity: "medium",
        fuelType,
        city,
        value: spread
      });
    }
  }

  return alerts.slice(0, 12);
}

export function buildCoverageAlerts(reports: PriceReport[], stations: Station[], fuelType: FuelType, days: AuditWindowDays): AuditAlert[] {
  const alerts: AuditAlert[] = [];
  const byStation = new Map<string, PriceReport[]>();

  for (const report of reports) {
    const list = byStation.get(report.stationId) ?? [];
    list.push(report);
    byStation.set(report.stationId, list);
  }

  for (const station of stations) {
    const stationReports = byStation.get(station.id) ?? [];
    const series = buildDailySeries(stationReports, days);
    const summary = summarizeAuditSeries(series, 1, 1, days);

    if (summary.coverageRatio < 0.25 || stationReports.length < 3) {
      alerts.push({
        kind: "low_coverage",
        title: `Cobertura baixa em ${station.name}`,
        description: `${station.city} · ${fuelLabels[fuelType]} ainda tem poucas observações nesta janela.`,
        severity: "low",
        fuelType,
        city: station.city,
        stationId: station.id,
        stationName: station.name,
        value: stationReports.length
      });
      continue;
    }

    const sorted = [...stationReports].sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime());
    const lastReportedAt = sorted[0]?.reportedAt;
    if (!lastReportedAt) continue;

    const daysSince = (Date.now() - new Date(lastReportedAt).getTime()) / 86_400_000;
    if (daysSince >= 30) {
      alerts.push({
        kind: "stale_station",
        title: `Sem atualização recente em ${station.name}`,
        description: `A última leitura de ${fuelLabels[fuelType]} faz ${Math.floor(daysSince)} dias.`,
        severity: daysSince >= 60 ? "high" : "medium",
        fuelType,
        city: station.city,
        stationId: station.id,
        stationName: station.name,
        value: daysSince
      });
    }
  }

  return alerts.slice(0, 12);
}

export function buildOverviewPackage(reports: PriceReport[], stations: Station[], fuelType: FuelType, days: AuditWindowDays): AuditOverview {
  const stationSummaries = buildStationSummaries(reports, stations, days);
  const citySummaries = buildCitySummaries(reports, stations, days);
  const alerts = [...buildAlerts(reports, stations, fuelType), ...buildCoverageAlerts(reports, stations, fuelType, days)].slice(0, 12);

  return {
    fuelType,
    days,
    summary: summarizeAuditSeries(buildDailySeries(reports, days), stationSummaries.length, citySummaries.length, days),
    series: buildDailySeries(reports, days),
    alerts,
    topStations: stationSummaries.slice(0, 6),
    topCities: citySummaries.slice(0, 6)
  };
}
