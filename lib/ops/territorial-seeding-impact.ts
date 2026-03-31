import { getAuditCitySlug } from "@/lib/audit/cities";
import { getActiveStations, getApprovedReportsSince, getStationReviewQueue } from "@/lib/data/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { PriceReport, Station } from "@/lib/types";

type CoverageState = "boa" | "fraca" | "vazia";
type TerritoryTransition = "vazia_para_fraca" | "fraca_para_boa" | "continua_vazia" | "boa_mantida" | "fraca_mantida" | "boa_para_fraca";

interface SeedRequestRow {
  station_id: string | null;
  creator_id: string;
  creator_email: string;
  status: "created" | "needs_review" | "duplicate" | string;
  created_at: string;
  payload: Record<string, unknown> | null;
}

interface LightEditRow {
  station_id: string;
  editor_id: string;
  editor_email: string;
  status: "saved" | "manual_review" | "duplicate_linked" | string;
  change_kind: "light_edit" | "manual_review" | "duplicate_link" | string;
  duplicate_of_station_id: string | null;
  created_at: string;
}

interface ZoneRow {
  city: string;
  citySlug: string;
  neighborhood: string;
  stations: number;
  stationsWithRecentPrice: number;
  stationsWithoutPrice: number;
  stationsInReview: number;
  stationsWithoutUpdate: number;
  recentReports: number;
  coverageRatio: number;
  coverageState: CoverageState;
  priority: number;
  signals: string[];
}

export interface SeedingImpactZoneRow extends ZoneRow {
  previousCoverageState: CoverageState;
  transition: TerritoryTransition;
  seedRequests: number;
  seedActive: number;
  seedNeedsReview: number;
  seedDuplicates: number;
  lightEdits: number;
  duplicateSignals: number;
}

export interface SeedingImpactEditorRow {
  editorId: string;
  editorEmail: string;
  totalSeeded: number;
  activeCount: number;
  reviewCount: number;
  duplicateCount: number;
  duplicateRate: number;
  citiesTouched: number;
  neighborhoodsTouched: number;
  lastSeedAt: string | null;
}

export interface SeedingImpactCityRow extends SeedingImpactZoneRow {
  neighborhoods: SeedingImpactZoneRow[];
}

export interface SeedingImpactReadout {
  summary: {
    periodDays: number;
    coverageWindowDays: number;
    seedRequests: number;
    seedActive: number;
    seedNeedsReview: number;
    seedDuplicates: number;
    lightEdits: number;
    duplicateSignals: number;
    editors: number;
    cities: number;
    neighborhoods: number;
    liftedEmptyToWeak: number;
    liftedWeakToGood: number;
    stillEmpty: number;
  };
  editors: SeedingImpactEditorRow[];
  cities: SeedingImpactCityRow[];
  neighborhoods: SeedingImpactZoneRow[];
  liftedEmptyToWeak: SeedingImpactZoneRow[];
  liftedWeakToGood: SeedingImpactZoneRow[];
  stillEmpty: SeedingImpactZoneRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function coverageState(ratio: number, stations: number): CoverageState {
  if (stations === 0 || ratio <= 0) return "vazia";
  if (ratio >= 0.6) return "boa";
  if (ratio >= 0.3) return "fraca";
  return "vazia";
}

function zoneKey(city: string, neighborhood: string) {
  return `${city}::${neighborhood}`;
}

function blankZone(city: string, citySlug: string, neighborhood: string): ZoneRow {
  return {
    city,
    citySlug,
    neighborhood,
    stations: 0,
    stationsWithRecentPrice: 0,
    stationsWithoutPrice: 0,
    stationsInReview: 0,
    stationsWithoutUpdate: 0,
    recentReports: 0,
    coverageRatio: 0,
    coverageState: "vazia",
    priority: 0,
    signals: []
  };
}

function buildSignals(zone: Pick<ZoneRow, "stationsWithoutPrice" | "stationsInReview" | "stationsWithoutUpdate" | "recentReports">) {
  const signals: string[] = [];
  if (zone.stationsWithoutPrice > 0) signals.push(`${zone.stationsWithoutPrice} sem preço`);
  if (zone.stationsInReview > 0) signals.push(`${zone.stationsInReview} em revisão`);
  if (zone.stationsWithoutUpdate > 0) signals.push(`${zone.stationsWithoutUpdate} sem atualização`);
  if (zone.recentReports > 0) signals.push(`${zone.recentReports} leituras`);
  return signals.slice(0, 4);
}

function priority(zone: Pick<ZoneRow, "coverageState" | "stationsWithoutPrice" | "stationsInReview" | "stationsWithoutUpdate" | "recentReports">) {
  return (
    (zone.coverageState === "vazia" ? 18 : zone.coverageState === "fraca" ? 8 : 0) +
    zone.stationsWithoutPrice * 5 +
    zone.stationsInReview * 4 +
    zone.stationsWithoutUpdate * 3 +
    zone.recentReports
  );
}

function buildCoverageSnapshot(stations: Station[], reports: PriceReport[], windowDays: number) {
  const zones = new Map<string, ZoneRow>();
  const reportCountByStation = new Map<string, number>();
  const lastReportByStation = new Map<string, string>();

  for (const report of reports) {
    reportCountByStation.set(report.stationId, (reportCountByStation.get(report.stationId) ?? 0) + 1);
    const current = lastReportByStation.get(report.stationId);
    if (!current || new Date(report.reportedAt).getTime() > new Date(current).getTime()) {
      lastReportByStation.set(report.stationId, report.reportedAt);
    }
  }

  for (const station of stations) {
    const city = station.city?.trim() || "Sem cidade";
    const neighborhood = station.neighborhood?.trim() || "Sem bairro";
    const citySlug = getAuditCitySlug(city);
    const key = zoneKey(city, neighborhood);
    const current = zones.get(key) ?? blankZone(city, citySlug, neighborhood);
    const recentReportsCount = reportCountByStation.get(station.id) ?? 0;
    const lastReportAt = lastReportByStation.get(station.id) ?? null;
    const daysSince = lastReportAt ? (Date.now() - new Date(lastReportAt).getTime()) / DAY_MS : Number.POSITIVE_INFINITY;
    const reviewStatus = station.geoReviewStatus === "pending" || station.geoReviewStatus === "manual_review" || station.visibilityStatus !== "public";

    current.stations += 1;
    current.stationsWithRecentPrice += recentReportsCount > 0 ? 1 : 0;
    current.stationsWithoutPrice += recentReportsCount > 0 ? 0 : 1;
    current.stationsInReview += reviewStatus ? 1 : 0;
    current.stationsWithoutUpdate += !lastReportAt || daysSince >= windowDays ? 1 : 0;
    current.recentReports += recentReportsCount;
    current.coverageRatio = current.stations > 0 ? current.stationsWithRecentPrice / current.stations : 0;
    current.coverageState = coverageState(current.coverageRatio, current.stations);
    current.priority = priority(current);
    current.signals = buildSignals(current);
    zones.set(key, current);
  }

  return zones;
}

function territoryTransition(previous: CoverageState, current: CoverageState): TerritoryTransition {
  if (previous === "vazia" && current === "fraca") return "vazia_para_fraca";
  if (previous === "fraca" && current === "boa") return "fraca_para_boa";
  if (current === "vazia") return "continua_vazia";
  if (previous === "boa" && current === "fraca") return "boa_para_fraca";
  if (current === "boa") return "boa_mantida";
  return "fraca_mantida";
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function extractSeedTerritory(payload: Record<string, unknown> | null, fallbackStation?: Station | null) {
  const city = normalizeText(payload?.city, fallbackStation?.city ?? "Sem cidade");
  const neighborhood = normalizeText(payload?.neighborhood, fallbackStation?.neighborhood ?? "Sem bairro");
  return { city, citySlug: getAuditCitySlug(city), neighborhood };
}

function normalizeSeedStatus(row: SeedRequestRow, station: Station | null) {
  if (station?.duplicateOfStationId || row.status === "duplicate") return "duplicate";
  if (station?.visibilityStatus === "public" && station?.geoReviewStatus === "ok") return "active";
  return "review";
}

export async function getTerritorialSeedingImpactReadout(periodDays = 30): Promise<SeedingImpactReadout> {
  const supabase = createSupabaseServiceClient();
  const now = Date.now();
  const periodStart = new Date(now - periodDays * DAY_MS);
  const coverageWindowDays = Math.max(periodDays * 2, 60);
  const currentWindowStart = new Date(now - coverageWindowDays * DAY_MS);
  const previousWindowStart = new Date(periodStart.getTime() - coverageWindowDays * DAY_MS);
  const fetchDays = Math.min(coverageWindowDays + periodDays, 240);

  const [activeStations, reviewStations, recentReports, seedRowsResult, lightEditsResult] = await Promise.all([
    getActiveStations(),
    getStationReviewQueue(400),
    getApprovedReportsSince(fetchDays, 5000),
    supabase.from("station_seed_requests").select("station_id,creator_id,creator_email,status,created_at,payload").gte("created_at", periodStart.toISOString()).order("created_at", { ascending: false }),
    supabase.from("station_light_edits").select("station_id,editor_id,editor_email,status,change_kind,duplicate_of_station_id,created_at").gte("created_at", periodStart.toISOString()).order("created_at", { ascending: false })
  ]);

  const stationMap = new Map<string, Station>();
  for (const station of [...activeStations, ...reviewStations]) {
    if (!stationMap.has(station.id)) stationMap.set(station.id, station);
  }

  const currentStations = [...stationMap.values()];
  const currentReports = recentReports.filter((report) => new Date(report.reportedAt).getTime() >= currentWindowStart.getTime());
  const previousStations = currentStations.filter((station) => new Date(station.createdAt).getTime() < periodStart.getTime());
  const previousReports = recentReports.filter((report) => {
    const reportedAt = new Date(report.reportedAt).getTime();
    return reportedAt >= previousWindowStart.getTime() && reportedAt < periodStart.getTime();
  });

  const currentZones = buildCoverageSnapshot(currentStations, currentReports, coverageWindowDays);
  const previousZones = buildCoverageSnapshot(previousStations, previousReports, coverageWindowDays);

  const seedRows = ((seedRowsResult.data ?? []) as SeedRequestRow[]).filter((row) => new Date(row.created_at).getTime() >= periodStart.getTime());
  const editRows = ((lightEditsResult.data ?? []) as LightEditRow[]).filter((row) => new Date(row.created_at).getTime() >= periodStart.getTime());

  const seedByZone = new Map<string, { total: number; active: number; review: number; duplicate: number; city: string; citySlug: string; neighborhood: string }>();
  const editorByEmail = new Map<string, { editorId: string; editorEmail: string; totalSeeded: number; activeCount: number; reviewCount: number; duplicateCount: number; cities: Set<string>; neighborhoods: Set<string>; lastSeedAt: string | null }>();
  const lightEditsByZone = new Map<string, number>();

  for (const row of seedRows) {
    const station = row.station_id ? stationMap.get(row.station_id) ?? null : null;
    const territory = extractSeedTerritory(row.payload, station);
    const key = zoneKey(territory.city, territory.neighborhood);
    const status = normalizeSeedStatus(row, station);
    const zone = seedByZone.get(key) ?? { total: 0, active: 0, review: 0, duplicate: 0, city: territory.city, citySlug: territory.citySlug, neighborhood: territory.neighborhood };

    zone.total += 1;
    if (status === "active") zone.active += 1;
    if (status === "review") zone.review += 1;
    if (status === "duplicate") zone.duplicate += 1;
    seedByZone.set(key, zone);

    const editorKey = row.creator_email.toLowerCase();
    const editor = editorByEmail.get(editorKey) ?? {
      editorId: row.creator_id,
      editorEmail: row.creator_email,
      totalSeeded: 0,
      activeCount: 0,
      reviewCount: 0,
      duplicateCount: 0,
      cities: new Set<string>(),
      neighborhoods: new Set<string>(),
      lastSeedAt: null
    };

    editor.totalSeeded += 1;
    editor.cities.add(territory.city);
    editor.neighborhoods.add(territory.neighborhood);
    if (status === "active") editor.activeCount += 1;
    if (status === "review") editor.reviewCount += 1;
    if (status === "duplicate") editor.duplicateCount += 1;
    if (!editor.lastSeedAt || new Date(row.created_at).getTime() > new Date(editor.lastSeedAt).getTime()) {
      editor.lastSeedAt = row.created_at;
    }
    editorByEmail.set(editorKey, editor);
  }

  for (const row of editRows) {
    const station = stationMap.get(row.station_id) ?? null;
    const city = station?.city?.trim() || "Sem cidade";
    const neighborhood = station?.neighborhood?.trim() || "Sem bairro";
    const key = zoneKey(city, neighborhood);
    lightEditsByZone.set(key, (lightEditsByZone.get(key) ?? 0) + 1);
  }

  const zones = new Map<string, SeedingImpactZoneRow>();
  const allKeys = new Set<string>([...currentZones.keys(), ...previousZones.keys(), ...seedByZone.keys()]);

  for (const key of allKeys) {
    const current = currentZones.get(key) ?? blankZone(seedByZone.get(key)?.city ?? "Sem cidade", seedByZone.get(key)?.citySlug ?? getAuditCitySlug("Sem cidade"), seedByZone.get(key)?.neighborhood ?? "Sem bairro");
    const previous = previousZones.get(key) ?? blankZone(current.city, current.citySlug, current.neighborhood);
    const seedCounts = seedByZone.get(key) ?? { total: 0, active: 0, review: 0, duplicate: 0, city: current.city, citySlug: current.citySlug, neighborhood: current.neighborhood };
    const lightEdits = lightEditsByZone.get(key) ?? 0;

    zones.set(key, {
      ...current,
      previousCoverageState: previous.coverageState,
      transition: territoryTransition(previous.coverageState, current.coverageState),
      seedRequests: seedCounts.total,
      seedActive: seedCounts.active,
      seedNeedsReview: seedCounts.review,
      seedDuplicates: seedCounts.duplicate,
      lightEdits,
      duplicateSignals: seedCounts.duplicate + lightEdits
    });
  }

  const neighborhoods = [...zones.values()].sort((left, right) => right.priority - left.priority || right.seedRequests - left.seedRequests || left.city.localeCompare(right.city, "pt-BR") || left.neighborhood.localeCompare(right.neighborhood, "pt-BR"));
  const cityMap = new Map<string, SeedingImpactZoneRow & { neighborhoods: SeedingImpactZoneRow[] }>();

  for (const zone of neighborhoods) {
    const current = cityMap.get(zone.city) ?? {
      ...blankZone(zone.city, zone.citySlug, zone.neighborhood),
      previousCoverageState: zone.previousCoverageState,
      transition: zone.transition,
      seedRequests: 0,
      seedActive: 0,
      seedNeedsReview: 0,
      seedDuplicates: 0,
      lightEdits: 0,
      duplicateSignals: 0,
      neighborhoods: []
    };

    current.stations += zone.stations;
    current.stationsWithRecentPrice += zone.stationsWithRecentPrice;
    current.stationsWithoutPrice += zone.stationsWithoutPrice;
    current.stationsInReview += zone.stationsInReview;
    current.stationsWithoutUpdate += zone.stationsWithoutUpdate;
    current.recentReports += zone.recentReports;
    current.seedRequests += zone.seedRequests;
    current.seedActive += zone.seedActive;
    current.seedNeedsReview += zone.seedNeedsReview;
    current.seedDuplicates += zone.seedDuplicates;
    current.lightEdits += zone.lightEdits;
    current.duplicateSignals += zone.duplicateSignals;
    current.neighborhoods.push(zone);
    cityMap.set(zone.city, current);
  }

  const cities = [...cityMap.values()]
    .map((city) => {
      city.neighborhoods = city.neighborhoods.sort((left, right) => right.priority - left.priority || right.seedRequests - left.seedRequests || left.neighborhood.localeCompare(right.neighborhood, "pt-BR"));
      city.coverageRatio = city.stations > 0 ? city.stationsWithRecentPrice / city.stations : 0;
      city.coverageState = coverageState(city.coverageRatio, city.stations);
      city.priority = priority(city);
      city.signals = buildSignals(city);
      return city;
    })
    .sort((left, right) => right.priority - left.priority || right.seedRequests - left.seedRequests || left.city.localeCompare(right.city, "pt-BR"));

  const editorRows = [...editorByEmail.values()]
    .map((editor) => ({
      editorId: editor.editorId,
      editorEmail: editor.editorEmail,
      totalSeeded: editor.totalSeeded,
      activeCount: editor.activeCount,
      reviewCount: editor.reviewCount,
      duplicateCount: editor.duplicateCount,
      duplicateRate: editor.totalSeeded > 0 ? editor.duplicateCount / editor.totalSeeded : 0,
      citiesTouched: editor.cities.size,
      neighborhoodsTouched: editor.neighborhoods.size,
      lastSeedAt: editor.lastSeedAt
    }))
    .sort((left, right) => right.totalSeeded - left.totalSeeded || right.activeCount - left.activeCount || left.editorEmail.localeCompare(right.editorEmail, "pt-BR"));

  const liftedEmptyToWeak = neighborhoods.filter((row) => row.transition === "vazia_para_fraca");
  const liftedWeakToGood = neighborhoods.filter((row) => row.transition === "fraca_para_boa");
  const stillEmpty = neighborhoods.filter((row) => row.coverageState === "vazia");

  return {
    summary: {
      periodDays,
      coverageWindowDays,
      seedRequests: seedRows.length,
      seedActive: neighborhoods.reduce((sum, row) => sum + row.seedActive, 0),
      seedNeedsReview: neighborhoods.reduce((sum, row) => sum + row.seedNeedsReview, 0),
      seedDuplicates: neighborhoods.reduce((sum, row) => sum + row.seedDuplicates, 0),
      lightEdits: editRows.length,
      duplicateSignals: neighborhoods.reduce((sum, row) => sum + row.duplicateSignals, 0),
      editors: editorRows.length,
      cities: cities.length,
      neighborhoods: neighborhoods.length,
      liftedEmptyToWeak: liftedEmptyToWeak.length,
      liftedWeakToGood: liftedWeakToGood.length,
      stillEmpty: stillEmpty.length
    },
    editors: editorRows,
    cities,
    neighborhoods,
    liftedEmptyToWeak,
    liftedWeakToGood,
    stillEmpty
  };
}



