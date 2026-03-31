import { getTerritorialCoverageReadout, type TerritorialCoverageZoneRow } from "@/lib/ops/territorial-coverage";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type TerritorialCoverageSnapshotKind = "daily" | "weekly";
export type TerritorialCoverageHistoryTrend = "melhorou" | "estagnado" | "piorou" | "sem_historico";

type CoverageState = TerritorialCoverageZoneRow["coverageState"];

interface TerritorialCoverageSnapshotRow {
  snapshot_date: string;
  snapshot_kind: TerritorialCoverageSnapshotKind;
  coverage_window_days: number;
  city: string;
  city_slug: string;
  neighborhood: string;
  stations: number;
  stations_with_recent_price: number;
  stations_without_price: number;
  stations_in_review: number;
  stations_without_update: number;
  seed_requests: number;
  seed_needs_review: number;
  seed_duplicates: number;
  light_edits: number;
  duplicate_signals: number;
  recent_reports: number;
  coverage_ratio: number;
  coverage_state: CoverageState;
  priority: number;
  signals: string[];
  generated_at: string;
  job_run_id: string | null;
  created_by: string | null;
}

interface TerritorialCoverageHistoryPoint {
  snapshotDate: string;
  stations: number;
  stationsWithRecentPrice: number;
  stationsWithoutPrice: number;
  stationsInReview: number;
  stationsWithoutUpdate: number;
  seedRequests: number;
  seedNeedsReview: number;
  seedDuplicates: number;
  lightEdits: number;
  duplicateSignals: number;
  recentReports: number;
  coverageRatio: number;
  coverageState: CoverageState;
  signals: string[];
}

export interface TerritorialCoverageHistoryZoneRow extends TerritorialCoverageHistoryPoint {
  city: string;
  citySlug: string;
  neighborhood: string;
  snapshotCount: number;
  previousCoverageState: CoverageState | null;
  previousCoverageRatio: number | null;
  trend: TerritorialCoverageHistoryTrend;
  series: TerritorialCoverageHistoryPoint[];
  priority: number;
}

export interface TerritorialCoverageHistoryCityRow extends TerritorialCoverageHistoryZoneRow {
  neighborhoods: TerritorialCoverageHistoryZoneRow[];
}

export interface TerritorialCoverageHistoryReadout {
  summary: {
    snapshotDays: number;
    snapshots: number;
    latestSnapshotDate: string | null;
    cities: number;
    neighborhoods: number;
    goodZones: number;
    weakZones: number;
    emptyZones: number;
    improvedZones: number;
    stalledZones: number;
    weakenedZones: number;
    citiesImproved: number;
    citiesStalled: number;
  };
  cities: TerritorialCoverageHistoryCityRow[];
  neighborhoods: TerritorialCoverageHistoryZoneRow[];
  improvedNeighborhoods: TerritorialCoverageHistoryZoneRow[];
  stalledNeighborhoods: TerritorialCoverageHistoryZoneRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_KIND: TerritorialCoverageSnapshotKind = "daily";
const COVERAGE_WINDOW_DAYS = 30;

function coverageState(ratio: number, stations: number): CoverageState {
  if (stations === 0 || ratio <= 0) return "vazia";
  if (ratio >= 0.6) return "boa";
  if (ratio >= 0.3) return "fraca";
  return "vazia";
}

function zoneKey(city: string, neighborhood: string) {
  return `${city}::${neighborhood}`;
}

function priority(row: Pick<TerritorialCoverageSnapshotRow, "coverage_state" | "stations_without_price" | "stations_in_review" | "stations_without_update" | "seed_requests" | "seed_needs_review" | "seed_duplicates" | "light_edits" | "duplicate_signals">) {
  return (
    (row.coverage_state === "vazia" ? 18 : row.coverage_state === "fraca" ? 8 : 0) +
    row.stations_without_price * 5 +
    row.stations_in_review * 4 +
    row.stations_without_update * 3 +
    row.seed_requests * 3 +
    row.seed_needs_review * 2 +
    row.seed_duplicates * 6 +
    row.light_edits * 2 +
    row.duplicate_signals * 5
  );
}

function buildSignals(row: Pick<TerritorialCoverageSnapshotRow, "stations_without_price" | "stations_in_review" | "stations_without_update" | "seed_requests" | "seed_needs_review" | "seed_duplicates" | "light_edits" | "duplicate_signals">) {
  const signals: string[] = [];
  if (row.stations_without_price > 0) signals.push(`${row.stations_without_price} sem preço recente`);
  if (row.stations_in_review > 0) signals.push(`${row.stations_in_review} em revisão`);
  if (row.stations_without_update > 0) signals.push(`${row.stations_without_update} sem atualização`);
  if (row.seed_requests > 0) signals.push(`${row.seed_requests} semeaduras`);
  if (row.seed_needs_review > 0) signals.push(`${row.seed_needs_review} para revisar`);
  if (row.seed_duplicates > 0) signals.push(`${row.seed_duplicates} duplicadas`);
  if (row.light_edits > 0) signals.push(`${row.light_edits} edições leves`);
  if (row.duplicate_signals > 0) signals.push(`${row.duplicate_signals} risco de duplicidade`);
  return signals.slice(0, 4);
}

function toSnapshotRow(zone: TerritorialCoverageZoneRow, snapshotDate: string, generatedAt: string, jobRunId: string | null, createdBy: string | null, snapshotKind: TerritorialCoverageSnapshotKind): TerritorialCoverageSnapshotRow {
  return {
    snapshot_date: snapshotDate,
    snapshot_kind: snapshotKind,
    coverage_window_days: COVERAGE_WINDOW_DAYS,
    city: zone.city,
    city_slug: zone.citySlug,
    neighborhood: zone.neighborhood,
    stations: zone.stations,
    stations_with_recent_price: zone.stationsWithRecentPrice,
    stations_without_price: zone.stationsWithoutPrice,
    stations_in_review: zone.stationsInReview,
    stations_without_update: zone.stationsWithoutUpdate,
    seed_requests: zone.seedRequests,
    seed_needs_review: zone.seedNeedsReview,
    seed_duplicates: zone.seedDuplicates,
    light_edits: zone.lightEdits,
    duplicate_signals: zone.duplicateSignals,
    recent_reports: zone.recentReports,
    coverage_ratio: zone.coverageRatio,
    coverage_state: zone.coverageState,
    priority: zone.priority,
    signals: zone.signals,
    generated_at: generatedAt,
    job_run_id: jobRunId,
    created_by: createdBy
  };
}

function trendFromPair(previousState: CoverageState | null, currentState: CoverageState, previousRatio: number | null, currentRatio: number) {
  if (previousState === null) return "sem_historico" as const;
  const rank = (state: CoverageState) => (state === "boa" ? 2 : state === "fraca" ? 1 : 0);
  if (rank(currentState) > rank(previousState) || (previousRatio !== null && currentRatio - previousRatio >= 0.1)) return "melhorou" as const;
  if (rank(currentState) < rank(previousState) || (previousRatio !== null && previousRatio - currentRatio >= 0.1)) return "piorou" as const;
  return "estagnado" as const;
}

function buildHistoryPoint(row: TerritorialCoverageSnapshotRow): TerritorialCoverageHistoryPoint {
  return {
    snapshotDate: row.snapshot_date,
    stations: row.stations,
    stationsWithRecentPrice: row.stations_with_recent_price,
    stationsWithoutPrice: row.stations_without_price,
    stationsInReview: row.stations_in_review,
    stationsWithoutUpdate: row.stations_without_update,
    seedRequests: row.seed_requests,
    seedNeedsReview: row.seed_needs_review,
    seedDuplicates: row.seed_duplicates,
    lightEdits: row.light_edits,
    duplicateSignals: row.duplicate_signals,
    recentReports: row.recent_reports,
    coverageRatio: row.coverage_ratio,
    coverageState: row.coverage_state,
    signals: row.signals
  };
}

export async function persistTerritorialCoverageSnapshot(input?: { jobRunId?: string | null; createdBy?: string | null; snapshotKind?: TerritorialCoverageSnapshotKind }) {
  const snapshotKind = input?.snapshotKind ?? SNAPSHOT_KIND;
  const coverage = await getTerritorialCoverageReadout(COVERAGE_WINDOW_DAYS);
  const supabase = createSupabaseServiceClient();
  const generatedAt = new Date().toISOString();
  const snapshotDate = generatedAt.slice(0, 10);
  const rows = coverage.neighborhoods.map((zone) => toSnapshotRow(zone, snapshotDate, generatedAt, input?.jobRunId ?? null, input?.createdBy ?? null, snapshotKind));

  const { error } = await supabase
    .from("territorial_coverage_snapshots")
    .upsert(rows, {
      onConflict: "snapshot_kind,snapshot_date,coverage_window_days,city_slug,neighborhood"
    });

  if (error) {
    throw error;
  }

  return {
    snapshotKind,
    snapshotDate,
    generatedAt,
    rowCount: rows.length,
    coverage
  };
}

function compareSnapshotRows(left: TerritorialCoverageSnapshotRow, right: TerritorialCoverageSnapshotRow) {
  return left.snapshot_date.localeCompare(right.snapshot_date) || left.city_slug.localeCompare(right.city_slug) || left.neighborhood.localeCompare(right.neighborhood, "pt-BR");
}

function aggregatePoints(rowsForDate: TerritorialCoverageSnapshotRow[], snapshotDate: string): TerritorialCoverageHistoryPoint {
  const aggregate = rowsForDate.reduce(
    (acc, row) => {
      acc.stations += row.stations;
      acc.stationsWithRecentPrice += row.stations_with_recent_price;
      acc.stationsWithoutPrice += row.stations_without_price;
      acc.stationsInReview += row.stations_in_review;
      acc.stationsWithoutUpdate += row.stations_without_update;
      acc.seedRequests += row.seed_requests;
      acc.seedNeedsReview += row.seed_needs_review;
      acc.seedDuplicates += row.seed_duplicates;
      acc.lightEdits += row.light_edits;
      acc.duplicateSignals += row.duplicate_signals;
      acc.recentReports += row.recent_reports;
      return acc;
    },
    {
      stations: 0,
      stationsWithRecentPrice: 0,
      stationsWithoutPrice: 0,
      stationsInReview: 0,
      stationsWithoutUpdate: 0,
      seedRequests: 0,
      seedNeedsReview: 0,
      seedDuplicates: 0,
      lightEdits: 0,
      duplicateSignals: 0,
      recentReports: 0
    }
  );

  const coverageRatio = aggregate.stations > 0 ? aggregate.stationsWithRecentPrice / aggregate.stations : 0;
  return {
    snapshotDate,
    coverageRatio,
    coverageState: coverageState(coverageRatio, aggregate.stations),
    signals: rowsForDate.at(-1)?.signals ?? [],
    ...aggregate
  };
}

export async function getTerritorialCoverageHistoryReadout(days = 90): Promise<TerritorialCoverageHistoryReadout> {
  const supabase = createSupabaseServiceClient();
  const startDate = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("territorial_coverage_snapshots")
    .select("snapshot_date,snapshot_kind,coverage_window_days,city,city_slug,neighborhood,stations,stations_with_recent_price,stations_without_price,stations_in_review,stations_without_update,seed_requests,seed_needs_review,seed_duplicates,light_edits,duplicate_signals,recent_reports,coverage_ratio,coverage_state,priority,signals,generated_at,job_run_id,created_by")
    .eq("snapshot_kind", SNAPSHOT_KIND)
    .eq("coverage_window_days", COVERAGE_WINDOW_DAYS)
    .gte("snapshot_date", startDate)
    .order("snapshot_date", { ascending: true })
    .order("city_slug", { ascending: true })
    .order("neighborhood", { ascending: true });

  if (error || !data) {
    return {
      summary: {
        snapshotDays: days,
        snapshots: 0,
        latestSnapshotDate: null,
        cities: 0,
        neighborhoods: 0,
        goodZones: 0,
        weakZones: 0,
        emptyZones: 0,
        improvedZones: 0,
        stalledZones: 0,
        weakenedZones: 0,
        citiesImproved: 0,
        citiesStalled: 0
      },
      cities: [],
      neighborhoods: [],
      improvedNeighborhoods: [],
      stalledNeighborhoods: []
    };
  }

  const snapshots = (data as TerritorialCoverageSnapshotRow[]).sort(compareSnapshotRows);
  const latestSnapshotDate = snapshots.at(-1)?.snapshot_date ?? null;
  const zoneSeriesMap = new Map<string, TerritorialCoverageHistoryZoneRow>();
  const cityDateAccumulator = new Map<string, Map<string, TerritorialCoverageSnapshotRow[]>>();

  for (const row of snapshots) {
    const key = zoneKey(row.city, row.neighborhood);
    const point = buildHistoryPoint(row);
    const existing = zoneSeriesMap.get(key);

    if (!existing) {
      zoneSeriesMap.set(key, {
        ...point,
        city: row.city,
        citySlug: row.city_slug,
        neighborhood: row.neighborhood,
        snapshotCount: 1,
        previousCoverageState: null,
        previousCoverageRatio: null,
        trend: "sem_historico",
        series: [point],
        priority: row.priority
      });
    } else {
      existing.snapshotCount += 1;
      existing.series.push(point);
      existing.previousCoverageState = existing.series.length >= 2 ? existing.series[existing.series.length - 2].coverageState : null;
      existing.previousCoverageRatio = existing.series.length >= 2 ? existing.series[existing.series.length - 2].coverageRatio : null;
      existing.trend = trendFromPair(existing.previousCoverageState, existing.coverageState, existing.previousCoverageRatio, existing.coverageRatio);
      existing.priority = row.priority;
      existing.signals = point.signals;
    }

    const cityDates = cityDateAccumulator.get(row.city) ?? new Map<string, TerritorialCoverageSnapshotRow[]>();
    const byDate = cityDates.get(row.snapshot_date) ?? [];
    byDate.push(row);
    cityDates.set(row.snapshot_date, byDate);
    cityDateAccumulator.set(row.city, cityDates);
  }

  const neighborhoodRows = [...zoneSeriesMap.values()].sort((left, right) => {
    const trendRank = (trend: TerritorialCoverageHistoryTrend) => (trend === "melhorou" ? 2 : trend === "estagnado" ? 1 : trend === "piorou" ? 0 : -1);
    return trendRank(right.trend) - trendRank(left.trend) || right.snapshotCount - left.snapshotCount || right.priority - left.priority || left.city.localeCompare(right.city, "pt-BR") || left.neighborhood.localeCompare(right.neighborhood, "pt-BR");
  });

  const cityRows: TerritorialCoverageHistoryCityRow[] = [...cityDateAccumulator.entries()]
    .map(([city, perDate]) => {
      const series = [...perDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([snapshotDate, rowsForDate]) => aggregatePoints(rowsForDate, snapshotDate));
      const latest = series.at(-1) ?? null;
      const previous = series.length >= 2 ? series[series.length - 2] : null;
      const cityNeighborhoods = neighborhoodRows.filter((row) => row.city === city);
      const aggregate = cityNeighborhoods.reduce(
        (acc, row) => {
          acc.stations += row.stations;
          acc.stationsWithRecentPrice += row.stationsWithRecentPrice;
          acc.stationsWithoutPrice += row.stationsWithoutPrice;
          acc.stationsInReview += row.stationsInReview;
          acc.stationsWithoutUpdate += row.stationsWithoutUpdate;
          acc.seedRequests += row.seedRequests;
          acc.seedNeedsReview += row.seedNeedsReview;
          acc.seedDuplicates += row.seedDuplicates;
          acc.lightEdits += row.lightEdits;
          acc.duplicateSignals += row.duplicateSignals;
          acc.recentReports += row.recentReports;
          return acc;
        },
        {
          stations: 0,
          stationsWithRecentPrice: 0,
          stationsWithoutPrice: 0,
          stationsInReview: 0,
          stationsWithoutUpdate: 0,
          seedRequests: 0,
          seedNeedsReview: 0,
          seedDuplicates: 0,
          lightEdits: 0,
          duplicateSignals: 0,
          recentReports: 0
        }
      );
      const coverageRatio = aggregate.stations > 0 ? aggregate.stationsWithRecentPrice / aggregate.stations : 0;
      const coverageStateValue = coverageState(coverageRatio, aggregate.stations);
      return {
        city,
        citySlug: city,
        snapshotDate: latest?.snapshotDate ?? startDate,
        neighborhood: city,
        snapshotCount: series.length,
        previousCoverageState: previous?.coverageState ?? null,
        previousCoverageRatio: previous?.coverageRatio ?? null,
        trend: latest ? trendFromPair(previous?.coverageState ?? null, latest.coverageState, previous?.coverageRatio ?? null, latest.coverageRatio) : "sem_historico",
        series,
        priority: priority({
          coverage_state: coverageStateValue,
          stations_without_price: aggregate.stationsWithoutPrice,
          stations_in_review: aggregate.stationsInReview,
          stations_without_update: aggregate.stationsWithoutUpdate,
          seed_requests: aggregate.seedRequests,
          seed_needs_review: aggregate.seedNeedsReview,
          seed_duplicates: aggregate.seedDuplicates,
          light_edits: aggregate.lightEdits,
          duplicate_signals: aggregate.duplicateSignals
        }),
        stations: aggregate.stations,
        stationsWithRecentPrice: aggregate.stationsWithRecentPrice,
        stationsWithoutPrice: aggregate.stationsWithoutPrice,
        stationsInReview: aggregate.stationsInReview,
        stationsWithoutUpdate: aggregate.stationsWithoutUpdate,
        seedRequests: aggregate.seedRequests,
        seedNeedsReview: aggregate.seedNeedsReview,
        seedDuplicates: aggregate.seedDuplicates,
        lightEdits: aggregate.lightEdits,
        duplicateSignals: aggregate.duplicateSignals,
        recentReports: aggregate.recentReports,
        coverageRatio,
        coverageState: coverageStateValue,
        signals: latest?.signals ?? buildSignals({
          stations_without_price: aggregate.stationsWithoutPrice,
          stations_in_review: aggregate.stationsInReview,
          stations_without_update: aggregate.stationsWithoutUpdate,
          seed_requests: aggregate.seedRequests,
          seed_needs_review: aggregate.seedNeedsReview,
          seed_duplicates: aggregate.seedDuplicates,
          light_edits: aggregate.lightEdits,
          duplicate_signals: aggregate.duplicateSignals
        }),
        neighborhoods: cityNeighborhoods
      };
    })
    .sort((left, right) => right.priority - left.priority || right.stations - left.stations || left.city.localeCompare(right.city, "pt-BR"));

  const improvedNeighborhoods = neighborhoodRows.filter((row) => row.trend === "melhorou");
  const stalledNeighborhoods = neighborhoodRows.filter((row) => row.trend === "estagnado");
  const improvedCities = cityRows.filter((row) => row.trend === "melhorou");
  const stalledCities = cityRows.filter((row) => row.trend === "estagnado");

  return {
    summary: {
      snapshotDays: days,
      snapshots: snapshots.length,
      latestSnapshotDate,
      cities: cityRows.length,
      neighborhoods: neighborhoodRows.length,
      goodZones: neighborhoodRows.filter((row) => row.coverageState === "boa").length,
      weakZones: neighborhoodRows.filter((row) => row.coverageState === "fraca").length,
      emptyZones: neighborhoodRows.filter((row) => row.coverageState === "vazia").length,
      improvedZones: improvedNeighborhoods.length,
      stalledZones: stalledNeighborhoods.length,
      weakenedZones: neighborhoodRows.filter((row) => row.trend === "piorou").length,
      citiesImproved: improvedCities.length,
      citiesStalled: stalledCities.length
    },
    cities: cityRows,
    neighborhoods: neighborhoodRows,
    improvedNeighborhoods,
    stalledNeighborhoods
  };
}




