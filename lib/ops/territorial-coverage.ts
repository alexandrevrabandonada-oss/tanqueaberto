import { getAuditCitySlug } from "@/lib/audit/cities";
import { getActiveStations, getApprovedReportsSince, getStationReviewQueue } from "@/lib/data/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Station } from "@/lib/types";

type CoverageState = "boa" | "fraca" | "vazia";

interface SeedRequestRow {
  station_id: string | null;
  status: "created" | "needs_review" | "duplicate" | string;
}

interface LightEditRow {
  station_id: string;
  status: "saved" | "manual_review" | "duplicate_linked" | string;
  change_kind: "light_edit" | "manual_review" | "duplicate_link" | string;
  duplicate_of_station_id: string | null;
}

export interface TerritorialCoverageZoneRow {
  city: string;
  citySlug: string;
  neighborhood: string;
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
  priority: number;
  signals: string[];
}

export interface TerritorialCoverageCityRow extends TerritorialCoverageZoneRow {
  neighborhoods: TerritorialCoverageZoneRow[];
}

export interface TerritorialCoverageReadout {
  summary: {
    cities: number;
    neighborhoods: number;
    goodZones: number;
    weakZones: number;
    emptyZones: number;
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
  };
  cities: TerritorialCoverageCityRow[];
  neighborhoods: TerritorialCoverageZoneRow[];
  topZones: TerritorialCoverageZoneRow[];
}

function coverageState(ratio: number, stations: number): CoverageState {
  if (stations === 0 || ratio <= 0) return "vazia";
  if (ratio >= 0.6) return "boa";
  if (ratio >= 0.3) return "fraca";
  return "vazia";
}

function buildSignals(row: Pick<TerritorialCoverageZoneRow, "stationsWithoutPrice" | "stationsInReview" | "stationsWithoutUpdate" | "seedRequests" | "seedNeedsReview" | "seedDuplicates" | "lightEdits" | "duplicateSignals">) {
  const signals: string[] = [];
  if (row.stationsWithoutPrice > 0) signals.push(`${row.stationsWithoutPrice} sem preço recente`);
  if (row.stationsInReview > 0) signals.push(`${row.stationsInReview} em revisão`);
  if (row.stationsWithoutUpdate > 0) signals.push(`${row.stationsWithoutUpdate} sem atualização`);
  if (row.seedRequests > 0) signals.push(`${row.seedRequests} semeaduras`);
  if (row.seedNeedsReview > 0) signals.push(`${row.seedNeedsReview} para revisar`);
  if (row.seedDuplicates > 0) signals.push(`${row.seedDuplicates} duplicadas`);
  if (row.lightEdits > 0) signals.push(`${row.lightEdits} edições leves`);
  if (row.duplicateSignals > 0) signals.push(`${row.duplicateSignals} risco de duplicidade`);
  return signals.slice(0, 4);
}

function priority(row: Pick<TerritorialCoverageZoneRow, "coverageState" | "stationsWithoutPrice" | "stationsInReview" | "stationsWithoutUpdate" | "seedRequests" | "seedNeedsReview" | "seedDuplicates" | "lightEdits" | "duplicateSignals">) {
  return (
    (row.coverageState === "vazia" ? 18 : row.coverageState === "fraca" ? 8 : 0) +
    row.stationsWithoutPrice * 5 +
    row.stationsInReview * 4 +
    row.stationsWithoutUpdate * 3 +
    row.seedRequests * 3 +
    row.seedNeedsReview * 2 +
    row.seedDuplicates * 6 +
    row.lightEdits * 2 +
    row.duplicateSignals * 5
  );
}

function zoneKey(city: string, neighborhood: string) {
  return `${city}::${neighborhood}`;
}

function blankZone(city: string, citySlug: string, neighborhood: string): TerritorialCoverageZoneRow {
  return {
    city,
    citySlug,
    neighborhood,
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
    recentReports: 0,
    coverageRatio: 0,
    coverageState: "vazia",
    priority: 0,
    signals: []
  };
}

function upsertZone(map: Map<string, TerritorialCoverageZoneRow>, station: Station) {
  const city = station.city?.trim() || "Sem cidade";
  const neighborhood = station.neighborhood?.trim() || "Sem bairro";
  const citySlug = getAuditCitySlug(city);
  const key = zoneKey(city, neighborhood);
  const current = map.get(key) ?? blankZone(city, citySlug, neighborhood);
  current.stations += 1;
  map.set(key, current);
  return current;
}

export async function getTerritorialCoverageReadout(days = 30): Promise<TerritorialCoverageReadout> {
  const supabase = createSupabaseServiceClient();
  const [activeStations, reviewStations, recentReports, seedRowsResult, lightEditsResult] = await Promise.all([
    getActiveStations(),
    getStationReviewQueue(200),
    getApprovedReportsSince(days, 5000),
    supabase.from("station_seed_requests").select("station_id,status").order("created_at", { ascending: false }),
    supabase.from("station_light_edits").select("station_id,status,change_kind,duplicate_of_station_id").order("created_at", { ascending: false })
  ]);

  const stationMap = new Map<string, Station>();
  for (const station of activeStations) stationMap.set(station.id, station);
  for (const station of reviewStations) if (!stationMap.has(station.id)) stationMap.set(station.id, station);

  const reportCountByStation = new Map<string, number>();
  const lastReportByStation = new Map<string, string>();
  for (const report of recentReports) {
    reportCountByStation.set(report.stationId, (reportCountByStation.get(report.stationId) ?? 0) + 1);
    const current = lastReportByStation.get(report.stationId);
    if (!current || new Date(report.reportedAt).getTime() > new Date(current).getTime()) {
      lastReportByStation.set(report.stationId, report.reportedAt);
    }
  }

  const seedStatsByStation = new Map<string, { total: number; needsReview: number; duplicate: number }>();
  for (const row of (seedRowsResult.data ?? []) as SeedRequestRow[]) {
    if (!row.station_id) continue;
    const current = seedStatsByStation.get(row.station_id) ?? { total: 0, needsReview: 0, duplicate: 0 };
    current.total += 1;
    if (row.status === "needs_review") current.needsReview += 1;
    if (row.status === "duplicate") current.duplicate += 1;
    seedStatsByStation.set(row.station_id, current);
  }

  const editStatsByStation = new Map<string, { total: number; duplicate: number }>();
  for (const row of (lightEditsResult.data ?? []) as LightEditRow[]) {
    const current = editStatsByStation.get(row.station_id) ?? { total: 0, duplicate: 0 };
    current.total += 1;
    if (row.status === "duplicate_linked" || row.change_kind === "duplicate_link" || row.duplicate_of_station_id) {
      current.duplicate += 1;
    }
    editStatsByStation.set(row.station_id, current);
  }

  const zones = new Map<string, TerritorialCoverageZoneRow>();

  for (const station of stationMap.values()) {
    const zone = upsertZone(zones, station);
    const recentReportsCount = reportCountByStation.get(station.id) ?? 0;
    const lastReportAt = lastReportByStation.get(station.id) ?? null;
    const daysSince = lastReportAt ? (Date.now() - new Date(lastReportAt).getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;
    const reviewStatus = station.geoReviewStatus === "pending" || station.geoReviewStatus === "manual_review" || station.visibilityStatus !== "public";
    const seeds = seedStatsByStation.get(station.id) ?? { total: 0, needsReview: 0, duplicate: 0 };
    const edits = editStatsByStation.get(station.id) ?? { total: 0, duplicate: 0 };

    zone.stationsWithRecentPrice += recentReportsCount > 0 ? 1 : 0;
    zone.stationsWithoutPrice += recentReportsCount > 0 ? 0 : 1;
    zone.stationsInReview += reviewStatus ? 1 : 0;
    zone.stationsWithoutUpdate += !lastReportAt || daysSince >= 30 ? 1 : 0;
    zone.seedRequests += seeds.total;
    zone.seedNeedsReview += seeds.needsReview;
    zone.seedDuplicates += seeds.duplicate;
    zone.lightEdits += edits.total;
    zone.duplicateSignals += (station.duplicateOfStationId ? 1 : 0) + seeds.duplicate + edits.duplicate;
    zone.recentReports += recentReportsCount;
    zone.coverageRatio = zone.stations > 0 ? zone.stationsWithRecentPrice / zone.stations : 0;
    zone.coverageState = coverageState(zone.coverageRatio, zone.stations);
    zone.priority = priority(zone);
    zone.signals = buildSignals(zone);
  }

  const neighborhoods = [...zones.values()].sort((left, right) => right.priority - left.priority || right.stations - left.stations || left.city.localeCompare(right.city, "pt-BR") || left.neighborhood.localeCompare(right.neighborhood, "pt-BR"));
  const cityMap = new Map<string, TerritorialCoverageCityRow>();

  for (const zone of neighborhoods) {
    const current = cityMap.get(zone.city) ?? { ...blankZone(zone.city, zone.citySlug, zone.neighborhood), neighborhoods: [] };
    current.stations += zone.stations;
    current.stationsWithRecentPrice += zone.stationsWithRecentPrice;
    current.stationsWithoutPrice += zone.stationsWithoutPrice;
    current.stationsInReview += zone.stationsInReview;
    current.stationsWithoutUpdate += zone.stationsWithoutUpdate;
    current.seedRequests += zone.seedRequests;
    current.seedNeedsReview += zone.seedNeedsReview;
    current.seedDuplicates += zone.seedDuplicates;
    current.lightEdits += zone.lightEdits;
    current.duplicateSignals += zone.duplicateSignals;
    current.recentReports += zone.recentReports;
    current.neighborhoods.push(zone);
    cityMap.set(zone.city, current);
  }

  const cities = [...cityMap.values()]
    .map((city) => {
      city.neighborhoods = city.neighborhoods.sort((left, right) => right.priority - left.priority || right.stations - left.stations || left.neighborhood.localeCompare(right.neighborhood, "pt-BR"));
      city.coverageRatio = city.stations > 0 ? city.stationsWithRecentPrice / city.stations : 0;
      city.coverageState = coverageState(city.coverageRatio, city.stations);
      city.priority = priority(city);
      city.signals = buildSignals(city);
      return city;
    })
    .sort((left, right) => right.priority - left.priority || right.stations - left.stations || left.city.localeCompare(right.city, "pt-BR"));

  return {
    summary: {
      cities: cities.length,
      neighborhoods: neighborhoods.length,
      goodZones: neighborhoods.filter((row) => row.coverageState === "boa").length,
      weakZones: neighborhoods.filter((row) => row.coverageState === "fraca").length,
      emptyZones: neighborhoods.filter((row) => row.coverageState === "vazia").length,
      stations: stationMap.size,
      stationsWithRecentPrice: neighborhoods.reduce((sum, row) => sum + row.stationsWithRecentPrice, 0),
      stationsWithoutPrice: neighborhoods.reduce((sum, row) => sum + row.stationsWithoutPrice, 0),
      stationsInReview: neighborhoods.reduce((sum, row) => sum + row.stationsInReview, 0),
      stationsWithoutUpdate: neighborhoods.reduce((sum, row) => sum + row.stationsWithoutUpdate, 0),
      seedRequests: neighborhoods.reduce((sum, row) => sum + row.seedRequests, 0),
      seedNeedsReview: neighborhoods.reduce((sum, row) => sum + row.seedNeedsReview, 0),
      seedDuplicates: neighborhoods.reduce((sum, row) => sum + row.seedDuplicates, 0),
      lightEdits: neighborhoods.reduce((sum, row) => sum + row.lightEdits, 0),
      duplicateSignals: neighborhoods.reduce((sum, row) => sum + row.duplicateSignals, 0),
      recentReports: neighborhoods.reduce((sum, row) => sum + row.recentReports, 0)
    },
    cities,
    neighborhoods,
    topZones: neighborhoods.slice(0, 12)
  };
}
