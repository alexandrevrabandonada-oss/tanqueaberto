import type { AuditSeriesPoint, AuditSummary, AuditWindowDays } from "@/lib/audit/types";
import { getConfidenceLabel, getCoverageLabel, getTrendLabel } from "@/lib/audit/confidence";

export interface AuditDailyAggregateRow {
  day: string;
  observations: number;
  min_price: number | null;
  max_price: number | null;
  median_price: number | null;
  average_price: number | null;
  latest_reported_at: string | null;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatBrazilDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

export function buildSeriesFromDailyRows(rows: AuditDailyAggregateRow[], days: AuditWindowDays): AuditSeriesPoint[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const series: AuditSeriesPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + offset);
    const day = formatBrazilDay(current);
    const row = byDay.get(day);

    series.push({
      day,
      observations: row?.observations ?? 0,
      minPrice: row?.min_price ?? null,
      maxPrice: row?.max_price ?? null,
      medianPrice: row?.median_price ?? null,
      averagePrice: row?.average_price ?? null,
      latestReportedAt: row?.latest_reported_at ?? null
    });
  }

  return series;
}

export function buildSeriesFromReports(reports: Array<{ observedAt?: string | null; reportedAt: string; price: number }>, days: AuditWindowDays): AuditSeriesPoint[] {
  const buckets = new Map<string, Array<{ observedAt?: string | null; reportedAt: string; price: number }>>();
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  for (const report of reports) {
    const date = report.observedAt ?? report.reportedAt;
    const day = formatBrazilDay(new Date(date));
    const list = buckets.get(day) ?? [];
    list.push(report);
    buckets.set(day, list);
  }

  const series: AuditSeriesPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + offset);
    const day = formatBrazilDay(current);
    const bucket = buckets.get(day) ?? [];
    const prices = bucket.map((report) => report.price).filter((value) => Number.isFinite(value));

    series.push({
      day,
      observations: bucket.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      medianPrice: prices.length ? median(prices) : null,
      averagePrice: prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null,
      latestReportedAt: bucket.slice().sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime())[0]?.reportedAt ?? null
    });
  }

  return series;
}

function getFirstAndLastPoints(series: AuditSeriesPoint[]) {
  const points = series.filter((point) => point.medianPrice !== null);
  return {
    first: points[0] ?? null,
    last: points.at(-1) ?? null
  };
}

export function summarizeAuditSeries(series: AuditSeriesPoint[], stationCount: number, cityCount: number, days: AuditWindowDays): AuditSummary {
  const values = series.flatMap((point) => [point.minPrice, point.maxPrice, point.medianPrice, point.averagePrice].filter((value): value is number => typeof value === "number"));
  const nonEmptyDays = series.filter((point) => point.observations > 0).length;
  const { first, last } = getFirstAndLastPoints(series);

  const changeAbsolute = first && last ? (last.medianPrice ?? 0) - (first.medianPrice ?? 0) : null;
  const changePercent = first && last && first.medianPrice ? (((last.medianPrice ?? 0) - first.medianPrice) / first.medianPrice) * 100 : null;
  const coverageRatio = days > 0 ? nonEmptyDays / days : 0;
  const observations = series.reduce((sum, point) => sum + point.observations, 0);
  const trend = getTrendLabel(changePercent);

  return {
    observations,
    stations: stationCount,
    cities: cityCount,
    minPrice: values.length ? Math.min(...values) : null,
    maxPrice: values.length ? Math.max(...values) : null,
    medianPrice: values.length ? median(values) : null,
    averagePrice: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    latestPrice: last?.medianPrice ?? null,
    previousPrice: series.filter((point) => point.medianPrice !== null).at(-2)?.medianPrice ?? null,
    changeAbsolute,
    changePercent,
    trend,
    coverageRatio,
    coverageLabel: getCoverageLabel(coverageRatio),
    confidenceLabel: getConfidenceLabel(coverageRatio, observations, Math.max(1, stationCount || cityCount || 1), days)
  };
}
