import type { FuelType, GeoConfidence, GeoSource, StationSource } from "@/lib/types";
import type { PriceReportRow, StationRow } from "@/types/supabase";

export interface NormalizedStationRecord {
  cnpj: string | null;
  source: StationSource;
  sourceId: string | null;
  name: string;
  brand: string;
  address: string;
  city: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  officialStatus: string;
  sigafStatus: string | null;
  products: string[];
  distributorName: string | null;
  importNotes: string | null;
  geoSource: GeoSource;
  geoConfidence: GeoConfidence;
}

export interface StationUpsertPayload extends NormalizedStationRecord {
  lastSyncedAt: string;
  updatedAt: string;
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeComparableText(value: unknown) {
  return stripDiacritics(normalizeText(value).toLowerCase());
}

export function normalizeCnpj(value: unknown) {
  const digits = String(value ?? "").replace(/\D+/g, "");
  return digits.length === 14 ? digits : null;
}

export function normalizeProducts(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[;,/|]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function normalizeGeoConfidence(value: unknown): GeoConfidence {
  const text = normalizeComparableText(value);
  if (text === "high" || text === "medio" || text === "medium" || text === "low") {
    return text === "medio" ? "medium" : (text as GeoConfidence);
  }
  return "low";
}

export function normalizeGeoSource(value: unknown): GeoSource {
  const text = normalizeComparableText(value);
  if (text === "osm") return "osm";
  if (text === "anp") return "anp";
  return "manual";
}

export function normalizeStationSource(value: unknown): StationSource {
  const text = normalizeComparableText(value);
  if (text === "anp") return "anp";
  if (text === "osm_enriched") return "osm_enriched";
  return "manual";
}

export function normalizeCoordinate(value: unknown) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidCoordinate(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function buildStationFallbackKey(input: { name: string; address: string; city: string; neighborhood: string }) {
  return [input.name, input.address, input.city, input.neighborhood]
    .map((part) => normalizeComparableText(part))
    .join("|");
}

export function deriveStationBrand(input: { brand?: unknown; distributorName?: unknown; officialStatus?: unknown }) {
  const brand = normalizeText(input.brand);
  if (brand) {
    return brand;
  }

  const distributor = normalizeText(input.distributorName);
  if (distributor) {
    return distributor;
  }

  const officialStatus = normalizeComparableText(input.officialStatus);
  if (officialStatus.includes("branca") || officialStatus.includes("indep")) {
    return "Bandeira branca";
  }

  return "Sem bandeira";
}

export function deriveOfficialStatus(input: unknown) {
  const text = normalizeText(input);
  return text ? text : "Desconhecido";
}

export function deriveGeoSource(lat: number | null, lng: number | null, fallback: GeoSource = "manual") {
  return isValidCoordinate(lat, lng) ? fallback : "manual";
}

export function deriveGeoConfidence(hasOfficialCoordinates: boolean, geocoded: boolean) {
  if (hasOfficialCoordinates) {
    return "high" as const;
  }
  if (geocoded) {
    return "medium" as const;
  }
  return "low" as const;
}

export function normalizeStationRecord(raw: Record<string, unknown>): NormalizedStationRecord {
  const cnpj = normalizeCnpj(raw.cnpj);
  const source = normalizeStationSource(raw.source);
  const sourceId = normalizeText(raw.source_id ?? raw.sourceId) || null;
  const name = normalizeText(raw.name);
  const brand = deriveStationBrand({ brand: raw.brand, distributorName: raw.distributor_name ?? raw.distributorName, officialStatus: raw.official_status ?? raw.officialStatus });
  const address = normalizeText(raw.address);
  const city = normalizeText(raw.city);
  const neighborhood = normalizeText(raw.neighborhood);
  const lat = normalizeCoordinate(raw.lat);
  const lng = normalizeCoordinate(raw.lng);
  const officialStatus = deriveOfficialStatus(raw.official_status ?? raw.officialStatus);
  const sigafStatus = normalizeText(raw.sigaf_status ?? raw.sigafStatus) || null;
  const products = normalizeProducts(raw.products);
  const distributorName = normalizeText(raw.distributor_name ?? raw.distributorName) || null;
  const importNotes = normalizeText(raw.import_notes ?? raw.importNotes) || null;
  const geoSource = normalizeGeoSource(raw.geo_source ?? raw.geoSource ?? (isValidCoordinate(lat, lng) ? source : "manual"));
  const geoConfidence = normalizeGeoConfidence(raw.geo_confidence ?? raw.geoConfidence ?? (isValidCoordinate(lat, lng) ? "high" : "low"));

  return {
    cnpj,
    source,
    sourceId,
    name,
    brand,
    address,
    city,
    neighborhood,
    lat,
    lng,
    isActive: raw.is_active === false ? false : true,
    officialStatus,
    sigafStatus,
    products,
    distributorName,
    importNotes,
    geoSource,
    geoConfidence
  };
}

export function stationRowToComparableKey(row: Pick<StationRow, "name" | "address" | "city" | "neighborhood">) {
  return buildStationFallbackKey(row);
}

export type FuelLabelMap = Record<FuelType, string>;


