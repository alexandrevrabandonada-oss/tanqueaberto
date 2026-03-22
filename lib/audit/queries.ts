import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapReportRow, mapReportsWithStations, mapStationRow } from "@/lib/data/mappers";
import { getStationById } from "@/lib/data/queries";
import type { FuelType, PriceReport, Station } from "@/lib/types";
import type { PriceReportRow, StationRow } from "@/types/supabase";
import { buildAlerts, buildCoverageAlerts, buildDailySeries, buildOverviewPackage, buildStationSummaries } from "@/lib/audit/metrics";
import type { AuditComparisonItem, AuditOverview, AuditWindowDays, CityAuditDetail, StationAuditDetail } from "@/lib/audit/types";
import { auditCities, getAuditCityBySlug, getAuditCitySlug } from "@/lib/audit/cities";
import { buildSeriesFromDailyRows, summarizeAuditSeries, type AuditDailyAggregateRow } from "@/lib/audit/series";

const reportSelect =
  "id,station_id,fuel_type,price,photo_url,photo_taken_at,observed_at,submitted_at,reported_at,approved_at,rejected_at,created_at,reporter_nickname,status,moderation_note,moderation_reason,moderated_by,source_kind,photo_hash,version";

function getWindowStart(days: AuditWindowDays) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return start.toISOString();
}

async function getActiveStationsWithMetadata(): Promise<Station[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load stations", error);
    return [];
  }

  return (data as StationRow[]).map(mapStationRow);
}

async function getApprovedReportsWindow(options: { days: AuditWindowDays; fuelType?: FuelType; stationIds?: string[] }) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("price_reports").select(reportSelect).eq("status", "approved").gte("reported_at", getWindowStart(options.days)).order("reported_at", { ascending: false }).limit(4000);

  if (options.fuelType) {
    query = query.eq("fuel_type", options.fuelType);
  }

  if (options.stationIds && options.stationIds.length > 0) {
    query = query.in("station_id", options.stationIds);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Failed to load audit reports", error);
    return [] as PriceReport[];
  }

  return (data as PriceReportRow[]).map(mapReportRow);
}

async function getDailyStationRows(stationIds: string[], fuelType: FuelType, days: AuditWindowDays) {
  if (stationIds.length === 0) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_daily_station_prices")
    .select("station_id,fuel_type,day,observations,min_price,max_price,median_price,average_price,latest_reported_at")
    .eq("fuel_type", fuelType)
    .in("station_id", stationIds)
    .gte("day", getWindowStart(days).slice(0, 10))
    .order("day", { ascending: true });

  if (error || !data) {
    console.warn("Failed to load station audit aggregates, falling back to raw reports", error);
    return null;
  }

  return data as Array<AuditDailyAggregateRow & { station_id: string; fuel_type: FuelType }>;
}

async function getDailyCityRows(city: string, fuelType: FuelType, days: AuditWindowDays) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_daily_city_prices")
    .select("city,fuel_type,day,observations,min_price,max_price,median_price,average_price,latest_reported_at")
    .eq("city", city)
    .eq("fuel_type", fuelType)
    .gte("day", getWindowStart(days).slice(0, 10))
    .order("day", { ascending: true });

  if (error || !data) {
    console.warn("Failed to load city audit aggregates, falling back to raw reports", error);
    return null;
  }

  return data as Array<AuditDailyAggregateRow & { city: string; fuel_type: FuelType }>;
}

function buildFuelSummaries(reports: PriceReport[]) {
  const byFuel = new Map<FuelType, PriceReport[]>();

  for (const report of reports) {
    const list = byFuel.get(report.fuelType) ?? [];
    list.push(report);
    byFuel.set(report.fuelType, list);
  }

  return Array.from(byFuel.entries())
    .map(([fuelType, fuelReports]) => {
      const prices = fuelReports.map((report) => report.price).filter((value) => Number.isFinite(value));
      return {
        fuelType,
        observations: fuelReports.length,
        medianPrice: prices.length ? prices.sort((left, right) => left - right)[Math.floor(prices.length / 2)] : null,
        lastReportedAt: fuelReports[0]?.reportedAt ?? null
      };
    })
    .sort((left, right) => right.observations - left.observations);
}

function buildStationRankingsFromRows(rows: Array<AuditDailyAggregateRow & { station_id: string; fuel_type: FuelType }>, stations: Station[], days: AuditWindowDays) {
  const byStation = new Map<string, Array<AuditDailyAggregateRow & { station_id: string; fuel_type: FuelType }>>();
  for (const row of rows) {
    const list = byStation.get(row.station_id) ?? [];
    list.push(row);
    byStation.set(row.station_id, list);
  }

  return stations
    .map((station) => {
      const series = buildSeriesFromDailyRows(byStation.get(station.id) ?? [], days);
      const summary = summarizeAuditSeries(series, 1, 1, days);
      return {
        stationId: station.id,
        stationName: station.name,
        city: station.city,
        observations: summary.observations,
        medianPrice: summary.medianPrice,
        lastReportedAt: series.slice().reverse().find((point) => point.latestReportedAt)?.latestReportedAt ?? null,
        coverageRatio: summary.coverageRatio,
        coverageLabel: summary.coverageLabel,
        confidenceLabel: summary.confidenceLabel,
        trend: summary.trend
      };
    })
    .filter((item) => item.observations > 0)
    .sort((left, right) => right.observations - left.observations || right.coverageRatio - left.coverageRatio || (left.medianPrice ?? Infinity) - (right.medianPrice ?? Infinity));
}

function buildCityRankingsFromRows(rows: Array<AuditDailyAggregateRow & { city: string; fuel_type: FuelType }>, stations: Station[], days: AuditWindowDays) {
  const stationCountByCity = stations.reduce<Record<string, number>>((acc, station) => {
    acc[station.city] = (acc[station.city] ?? 0) + 1;
    return acc;
  }, {});

  const byCity = new Map<string, Array<AuditDailyAggregateRow & { city: string; fuel_type: FuelType }>>();
  for (const row of rows) {
    const list = byCity.get(row.city) ?? [];
    list.push(row);
    byCity.set(row.city, list);
  }

  return Array.from(byCity.entries())
    .map(([city, cityRows]) => {
      const series = buildSeriesFromDailyRows(cityRows, days);
      const summary = summarizeAuditSeries(series, stationCountByCity[city] ?? 0, 1, days);
      return {
        city,
        citySlug: getAuditCitySlug(city),
        fuelType: cityRows[0]?.fuel_type ?? "gasolina_comum",
        days,
        stations: stationCountByCity[city] ?? 0,
        observations: summary.observations,
        medianPrice: summary.medianPrice,
        averagePrice: summary.averagePrice,
        lastReportedAt: series.slice().reverse().find((point) => point.latestReportedAt)?.latestReportedAt ?? null,
        coverageRatio: summary.coverageRatio,
        coverageLabel: summary.coverageLabel,
        confidenceLabel: summary.confidenceLabel,
        trend: summary.trend,
        minPrice: summary.minPrice,
        maxPrice: summary.maxPrice,
        amplitude: summary.minPrice !== null && summary.maxPrice !== null ? summary.maxPrice - summary.minPrice : null,
        changePercent: summary.changePercent,
        changeAbsolute: summary.changeAbsolute
      } satisfies AuditComparisonItem;
    })
    .sort((left, right) => right.observations - left.observations || right.coverageRatio - left.coverageRatio || left.city.localeCompare(right.city));
}

export async function getAuditOverview(fuelType: FuelType, days: AuditWindowDays): Promise<AuditOverview> {
  const stations = await getActiveStationsWithMetadata();
  const stationIds = stations.map((station) => station.id);
  const [dailyRows, reports] = await Promise.all([getDailyStationRows(stationIds, fuelType, days), getApprovedReportsWindow({ days, fuelType })]);

  if (dailyRows && dailyRows.length > 0) {
    const cityNames = auditCities.map((city) => city.name);
    const cityRowLists = await Promise.all(cityNames.map((cityName) => getDailyCityRows(cityName, fuelType, days)));
    const cityRows = cityRowLists.flat().filter((row): row is NonNullable<typeof row> => Boolean(row));
    const series = buildSeriesFromDailyRows(dailyRows, days);
    const topStations = buildStationRankingsFromRows(dailyRows, stations, days).slice(0, 6);
    const topCities = buildCityRankingsFromRows(cityRows, stations, days).slice(0, 6);
    const detailSummary = summarizeAuditSeries(series, stations.length, cityNames.length, days);

    return {
      fuelType,
      days,
      summary: detailSummary,
      series,
      alerts: [...buildAlerts(reports, stations, fuelType), ...buildCoverageAlerts(reports, stations, fuelType, days)].slice(0, 12),
      topStations,
      topCities
    };
  }

  return buildOverviewPackage(reports, stations, fuelType, days);
}

export async function getStationAuditDetail(stationId: string, fuelType: FuelType, days: AuditWindowDays): Promise<StationAuditDetail | null> {
  const station = await getStationById(stationId);
  if (!station) {
    return null;
  }

  const [reports, dailyRows] = await Promise.all([
    getApprovedReportsWindow({ days, stationIds: [stationId] }),
    getDailyStationRows([stationId], fuelType, days)
  ]);
  const fuelReports = reports.filter((report) => report.stationId === stationId && report.fuelType === fuelType);
  const series = dailyRows && dailyRows.length > 0 ? buildSeriesFromDailyRows(dailyRows, days) : buildDailySeries(fuelReports, days);
  const summaries = buildFuelSummaries(reports);

  return {
    stationId,
    days,
    fuelType,
    summary: summarizeAuditSeries(series, 1, 1, days),
    series,
    recentReports: fuelReports.slice(0, 12).map((report) => ({
      id: report.id,
      fuelType: report.fuelType,
      price: report.price,
      photoUrl: report.photoUrl,
      reportedAt: report.reportedAt,
      observedAt: report.observedAt,
      submittedAt: report.submittedAt,
      reporterNickname: report.reporterNickname,
      sourceKind: report.sourceKind
    })),
    alerts: [...buildAlerts(fuelReports, [station], fuelType), ...buildCoverageAlerts(fuelReports, [station], fuelType, days)].slice(0, 8),
    fuelSummaries: summaries
  };
}

export async function getCityAuditDetail(citySlug: string, fuelType: FuelType, days: AuditWindowDays): Promise<CityAuditDetail | null> {
  const city = getAuditCityBySlug(citySlug);
  if (!city) {
    return null;
  }

  const stations = (await getActiveStationsWithMetadata()).filter((station) => station.city.toLowerCase() === city.name.toLowerCase());
  if (stations.length === 0) {
    return null;
  }

  const stationIds = stations.map((station) => station.id);
  const [reports, dailyRows] = await Promise.all([
    getApprovedReportsWindow({ days, fuelType, stationIds }),
    getDailyCityRows(city.name, fuelType, days)
  ]);
  const mappedReports = mapReportsWithStations(reports, stations);
  const series = dailyRows && dailyRows.length > 0 ? buildSeriesFromDailyRows(dailyRows, days) : buildDailySeries(reports, days);
  const topStations = buildStationSummaries(reports, stations, days).slice(0, 8);

  return {
    city: city.name,
    citySlug: city.slug,
    days,
    fuelType,
    summary: summarizeAuditSeries(series, stations.length, 1, days),
    series,
    recentReports: mappedReports.slice(0, 12).map((report) => ({
      id: report.id,
      stationName: report.station.name,
      stationId: report.station.id,
      fuelType: report.fuelType,
      price: report.price,
      photoUrl: report.photoUrl,
      reportedAt: report.reportedAt,
      observedAt: report.observedAt,
      submittedAt: report.submittedAt,
      reporterNickname: report.reporterNickname,
      sourceKind: report.sourceKind
    })),
    alerts: [...buildAlerts(reports, stations, fuelType), ...buildCoverageAlerts(reports, stations, fuelType, days)].slice(0, 8),
    topStations
  };
}

export async function getAuditExportOverview(fuelType: FuelType, days: AuditWindowDays) {
  return getAuditOverview(fuelType, days);
}

export async function getAuditStationsForCity(citySlug: string) {
  const city = getAuditCityBySlug(citySlug);
  if (!city) {
    return [] as Station[];
  }

  return (await getActiveStationsWithMetadata()).filter((station) => station.city.toLowerCase() === city.name.toLowerCase());
}

export async function getCityComparison(fuelType: FuelType, days: AuditWindowDays) {
  const stations = await getActiveStationsWithMetadata();
  const cityNames = auditCities.map((city) => city.name);
  const cityRows = await Promise.all(cityNames.map((cityName) => getDailyCityRows(cityName, fuelType, days)));
  return buildCityRankingsFromRows(cityRows.flat().filter((row): row is NonNullable<typeof row> => Boolean(row)), stations, days);
}
