import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { mapReportRow, mapStationRow } from "@/lib/data/mappers";
import { getTerritorialDuplicateCandidates, type TerritorialDuplicateCandidate } from "@/lib/ops/territorial-curation";
import { getStationPublicName } from "@/lib/quality/stations";
import type { FuelType, PriceReport, Station } from "@/lib/types";
import type { PriceReportRow, StationRow } from "@/types/supabase";

interface StationEditorStationRow extends StationRow {
  last_reported_at?: string | null;
}

export interface StationEditorStationListFilters {
  q?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  brand?: string | null;
  price?: "all" | "recent" | "without_recent";
  review?: "all" | "review";
  page?: number;
  pageSize?: number;
}

export interface StationEditorStationItem {
  station: Station;
  publicName: string;
  lastReportedAt: string | null;
  latestPrice: number | null;
  latestFuelType: FuelType | null;
  latestPriceReportedAt: string | null;
  hasRecentPrice: boolean;
  statusLabel: string;
  statusTone: "default" | "warning" | "danger" | "outline" | "secondary" | "accent";
  duplicateCandidates: TerritorialDuplicateCandidate[];
}

type ResolvedStationEditorStationListFilters = Required<Omit<StationEditorStationListFilters, "q" | "city" | "neighborhood" | "brand">> & {
  q: string;
  city: string;
  neighborhood: string;
  brand: string;
};

export interface StationEditorStationListReadout {
  filters: ResolvedStationEditorStationListFilters;
  summary: {
    total: number;
    recent: number;
    withoutRecent: number;
    review: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  items: StationEditorStationItem[];
}

function sanitizeTextFilter(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

function isRecentTimestamp(value: string | null | undefined, referenceTime = Date.now()) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return referenceTime - timestamp <= 48 * 60 * 60 * 1000;
}

function isReviewStation(station: Station) {
  return station.visibilityStatus === "review" || station.geoReviewStatus === "manual_review" || Boolean(station.duplicateOfStationId);
}

function deriveStatus(station: Station, hasRecentPrice: boolean) {
  if (station.duplicateOfStationId) {
    return { label: "duplicado", tone: "warning" as const };
  }

  if (station.visibilityStatus === "hidden" || station.isActive === false) {
    return { label: "oculto", tone: "danger" as const };
  }

  if (station.visibilityStatus === "review" || station.geoReviewStatus === "manual_review") {
    return { label: "em revisão", tone: "warning" as const };
  }

  if (station.geoReviewStatus === "pending") {
    return { label: "geo pendente", tone: "outline" as const };
  }

  if (hasRecentPrice) {
    return { label: "ativo", tone: "accent" as const };
  }

  return { label: "sem preço recente", tone: "secondary" as const };
}

function applyClientFilters(stations: Array<{ station: Station; lastReportedAt: string | null }>, filters: ResolvedStationEditorStationListFilters) {
  return stations.filter(({ station, lastReportedAt }) => {
    const hasRecentPrice = isRecentTimestamp(lastReportedAt);

    if (filters.price === "recent" && !hasRecentPrice) return false;
    if (filters.price === "without_recent" && hasRecentPrice) return false;
    if (filters.review === "review" && !isReviewStation(station)) return false;

    return true;
  });
}

async function getLatestApprovedReports(stationIds: string[]) {
  if (stationIds.length === 0) {
    return new Map<string, PriceReport>();
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("price_reports")
    .select("id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,approved_at,rejected_at,created_at,reporter_nickname,ip_hash,status,moderation_note,moderation_reason,moderated_by,source_kind,photo_hash,location_distance,location_confidence,reconciliation_id,is_confirmation,metadata,version")
    .eq("status", "approved")
    .in("station_id", stationIds)
    .order("reported_at", { ascending: false })
    .limit(Math.max(300, stationIds.length * 18));

  if (error || !data) {
    return new Map<string, PriceReport>();
  }

  const latestByStation = new Map<string, PriceReport>();
  for (const report of (data as PriceReportRow[]).map(mapReportRow)) {
    if (!latestByStation.has(report.stationId)) {
      latestByStation.set(report.stationId, report);
    }
  }

  return latestByStation;
}

async function getCatalogForDuplicates() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .eq("is_active", true)
    .order("name_public", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error || !data) {
    return [] as Station[];
  }

  return (data as StationEditorStationRow[]).map((row) => mapStationRow(row));
}

export async function getStationEditorStationList(input: StationEditorStationListFilters = {}): Promise<StationEditorStationListReadout> {
  const filters: ResolvedStationEditorStationListFilters = {
    q: sanitizeTextFilter(input.q),
    city: sanitizeTextFilter(input.city),
    neighborhood: sanitizeTextFilter(input.neighborhood),
    brand: sanitizeTextFilter(input.brand),
    price: input.price === "recent" || input.price === "without_recent" ? input.price : "all",
    review: input.review === "review" ? "review" : "all",
    page: Number.isFinite(input.page) ? Math.max(1, Number(input.page)) : 1,
    pageSize: Number.isFinite(input.pageSize) ? Math.max(12, Math.min(80, Number(input.pageSize))) : 24
  };

  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .order("city", { ascending: true })
    .order("neighborhood", { ascending: true })
    .order("name_public", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (filters.q) {
    const term = escapeLike(filters.q);
    query = query.or(`name.ilike.%${term}%,name_public.ilike.%${term}%,name_official.ilike.%${term}%`);
  }

  if (filters.city) {
    query = query.ilike("city", `%${escapeLike(filters.city)}%`);
  }

  if (filters.neighborhood) {
    query = query.ilike("neighborhood", `%${escapeLike(filters.neighborhood)}%`);
  }

  if (filters.brand) {
    query = query.ilike("brand", `%${escapeLike(filters.brand)}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    return {
      filters,
      summary: { total: 0, recent: 0, withoutRecent: 0, review: 0 },
      pagination: { page: 1, pageSize: filters.pageSize, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      items: []
    };
  }

  const allStations = (data as StationEditorStationRow[]).map((row) => ({
    station: mapStationRow(row),
    lastReportedAt: row.last_reported_at ?? null
  }));

  const filteredStations = applyClientFilters(allStations, filters);
  const summary = {
    total: filteredStations.length,
    recent: filteredStations.filter((item) => isRecentTimestamp(item.lastReportedAt)).length,
    withoutRecent: filteredStations.filter((item) => !isRecentTimestamp(item.lastReportedAt)).length,
    review: filteredStations.filter((item) => isReviewStation(item.station)).length
  };

  const totalPages = Math.max(1, Math.ceil(filteredStations.length / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * filters.pageSize;
  const pageRows = filteredStations.slice(start, start + filters.pageSize);
  const stationIds = pageRows.map((item) => item.station.id);

  const [latestReports, duplicateCatalog] = await Promise.all([
    getLatestApprovedReports(stationIds),
    getCatalogForDuplicates()
  ]);

  const items = pageRows.map(({ station, lastReportedAt }) => {
    const publicName = getStationPublicName(station);
    const latestReport = latestReports.get(station.id) ?? null;
    const hasRecentPrice = isRecentTimestamp(lastReportedAt ?? latestReport?.reportedAt ?? null);
    const status = deriveStatus(station, hasRecentPrice);
    const duplicateCandidates = getTerritorialDuplicateCandidates(station, duplicateCatalog, 3);

    return {
      station,
      publicName,
      lastReportedAt,
      latestPrice: latestReport?.price ?? null,
      latestFuelType: latestReport?.fuelType ?? null,
      latestPriceReportedAt: latestReport?.reportedAt ?? null,
      hasRecentPrice,
      statusLabel: status.label,
      statusTone: status.tone,
      duplicateCandidates
    } satisfies StationEditorStationItem;
  });

  return {
    filters: { ...filters, page },
    summary,
    pagination: {
      page,
      pageSize: filters.pageSize,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    },
    items
  };
}
