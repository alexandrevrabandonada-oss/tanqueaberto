import type { Station, StationWithReports } from "@/lib/types";

export interface StationPublicIdentity extends Pick<Station, "name" | "brand" | "city" | "neighborhood"> {
  address?: string | null;
  namePublic?: string | null;
  nameOfficial?: string | null;
  geoReviewStatus?: Station["geoReviewStatus"];
}

export interface StationEditorialReviewItem {
  station: Station;
  displayName: string;
  reasons: string[];
  duplicateGroupSize: number;
  priorityScore: number;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function titleCaseToken(token: string) {
  if (!token) {
    return token;
  }

  if (/^[A-Z0-9&.-]{2,6}$/.test(token) && token === token.toUpperCase()) {
    return token.toUpperCase();
  }

  const lower = token.toLowerCase();
  return lower.slice(0, 1).toUpperCase() + lower.slice(1);
}

function splitWords(value: string) {
  return value.split(/\s+/g).map((item) => item.trim()).filter(Boolean);
}

export function isValidStationCoordinate(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  if (lat === 0 && lng === 0) {
    return false;
  }

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function hasPendingStationLocationReview(station: Pick<Station, "lat" | "lng" | "geoReviewStatus">) {
  if (!isValidStationCoordinate(station.lat, station.lng)) {
    return true;
  }

  return station.geoReviewStatus !== "ok";
}

export function normalizeStationPublicName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(LTDA|EPP|ME|EIRELI|S\/A|SA)\b\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function detectStreetHint(address: string) {
  const cleaned = normalizeStationPublicName(address);
  if (!cleaned) {
    return "";
  }

  const firstSegment = cleaned.split(",")[0] ?? "";
  return firstSegment.trim();
}

export function detectGenericStationName(name: string) {
  const normalized = normalizeStationPublicName(name).toLowerCase();
  return /^(posto|auto posto|combust[íi]veis?|gasolina|revenda|posto de combust[íi]vel|posto combust[íi]vel)$/i.test(normalized) || normalized.length < 4;
}

function buildFallbackStationName(station: StationPublicIdentity) {
  const candidates = [station.namePublic, station.nameOfficial, station.name, station.brand]
    .map((value) => normalizeStationPublicName(String(value ?? "")))
    .filter(Boolean);

  let base = candidates.find((value) => !detectGenericStationName(value)) ?? candidates[0] ?? "";
  const neighborhood = normalizeStationPublicName(station.neighborhood ?? "");
  const streetHint = detectStreetHint(station.address ?? "");
  const city = normalizeStationPublicName(station.city ?? "");
  const brand = normalizeStationPublicName(station.brand ?? "");

  if (!base || detectGenericStationName(base)) {
    base = [brand, streetHint || neighborhood, city].filter(Boolean)[0] ?? "Posto";
  }

  if (detectGenericStationName(base)) {
    base = [brand, streetHint || neighborhood || city].filter(Boolean).join(" · ") || "Posto";
  }

  const titleCased = splitWords(base).map(titleCaseToken).join(" ");
  const segments = titleCased.split(" · ").map((part) => part.trim()).filter(Boolean);

  if (segments.length === 1) {
    if (streetHint && !normalizeText(titleCased).includes(normalizeText(streetHint))) {
      segments.push(splitWords(streetHint).map(titleCaseToken).join(" "));
    } else if (neighborhood && !normalizeText(titleCased).includes(normalizeText(neighborhood))) {
      segments.push(splitWords(neighborhood).map(titleCaseToken).join(" "));
    } else if (city && !normalizeText(titleCased).includes(normalizeText(city))) {
      segments.push(splitWords(city).map(titleCaseToken).join(" "));
    }
  }

  return segments.filter(Boolean).join(" · ").replace(/\s+/g, " ").trim() || "Posto";
}

export function formatStationDisplayName(name: string) {
  const cleaned = normalizeStationPublicName(name);
  if (!cleaned || detectGenericStationName(cleaned)) {
    return "Posto";
  }

  return splitWords(cleaned)
    .map(titleCaseToken)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getStationPublicName(station: StationPublicIdentity) {
  const explicit = normalizeStationPublicName(station.namePublic ?? "");
  if (explicit && !detectGenericStationName(explicit)) {
    return formatStationDisplayName(explicit);
  }

  const fallback = buildFallbackStationName(station);
  return fallback;
}

export function hasStationEditorialRisk(station: StationPublicIdentity) {
  const publicName = getStationPublicName(station);
  return detectGenericStationName(publicName) || station.geoReviewStatus === "manual_review";
}

export function getStationEditorialReviewReason(station: StationPublicIdentity) {
  const reasons: string[] = [];
  const publicName = getStationPublicName(station);

  if (detectGenericStationName(publicName)) {
    reasons.push("Nome genérico ou pouco distintivo");
  }

  if (!station.namePublic?.trim() && !station.nameOfficial?.trim()) {
    reasons.push("Sem nome público consolidado");
  }

  if (station.geoReviewStatus === "manual_review") {
    reasons.push("Curadoria territorial pendente");
  }

  return reasons;
}

export function getStationDuplicateSignature(station: StationPublicIdentity) {
  const parts = [getStationPublicName(station), station.brand, station.neighborhood, station.city]
    .map((value) => normalizeText(String(value ?? "")))
    .filter(Boolean);

  return parts.join("|");
}

export function getStationEditorialReviewQueue(stations: Station[]) {
  const grouped = new Map<string, Station[]>();

  for (const station of stations) {
    const key = getStationDuplicateSignature(station);
    const list = grouped.get(key) ?? [];
    list.push(station);
    grouped.set(key, list);
  }

  const items: StationEditorialReviewItem[] = [];

  for (const station of stations) {
    const duplicateGroup = grouped.get(getStationDuplicateSignature(station)) ?? [];
    const displayName = getStationPublicName(station);
    const reasons = getStationEditorialReviewReason(station);
    const duplicateGroupSize = duplicateGroup.length;

    if (duplicateGroupSize > 1) {
      reasons.push(`Possível repetição visual (${duplicateGroupSize} no mesmo recorte)`);
    }

    if (!displayName || detectGenericStationName(displayName)) {
      reasons.push("Nome precisa de fallback mais legível");
    }

    if (reasons.length === 0) {
      continue;
    }

    const priorityCities = new Set(["VOLTA REDONDA", "BARRA MANSA", "BARRA DO PIRAI"]);
    let priorityScore = 0;

    if (priorityCities.has(station.city.trim().toUpperCase())) {
      priorityScore += 20;
    }

    if (duplicateGroupSize > 1) {
      priorityScore += Math.min(30, duplicateGroupSize * 6);
    }

    if (detectGenericStationName(displayName)) {
      priorityScore += 30;
    }

    if (station.geoReviewStatus === "manual_review") {
      priorityScore += 15;
    }

    if (!station.namePublic?.trim()) {
      priorityScore += 10;
    }

    items.push({
      station,
      displayName,
      reasons,
      duplicateGroupSize,
      priorityScore
    });
  }

  return items.sort((left, right) => right.priorityScore - left.priorityScore || left.station.city.localeCompare(right.station.city, "pt-BR") || left.displayName.localeCompare(right.displayName, "pt-BR")).slice(0, 12);
}

export function canShowStationOnMap(station: Pick<Station, "lat" | "lng" | "geoConfidence" | "geoReviewStatus">) {
  if (!isValidStationCoordinate(station.lat, station.lng)) {
    return false;
  }

  if (station.geoReviewStatus === "manual_review") {
    return false;
  }

  return station.geoConfidence === "high" || station.geoConfidence === "medium";
}

export function getStationMarketPresence(station: Pick<StationWithReports, "latestReports">) {
  const latest = station.latestReports[0];

  if (!latest) {
    return "none" as const;
  }

  const age = Date.now() - new Date(latest.reportedAt).getTime();
  if (age <= 48 * 60 * 60 * 1000) {
    return "recent" as const;
  }

  return "stale" as const;
}

export function hasRecentStationPrice(station: Pick<StationWithReports, "latestReports">, referenceDate = new Date()) {
  return getStationMarketPresence(station) === "recent";
}

export function getStationMarketPresenceLabel(station: Pick<StationWithReports, "latestReports">) {
  const presence = getStationMarketPresence(station);

  if (presence === "recent") {
    return "Preço recente";
  }

  return "Sem atualização recente";
}

export function computeStationPriorityScore(input: {
  city: string;
  geoConfidence?: string | null;
  hasRecentReport?: boolean;
  reportCount?: number;
  isReviewed?: boolean;
}) {
  const priorityCities = new Set(["VOLTA REDONDA", "BARRA MANSA", "RESENDE"]);
  let score = 0;

  if (priorityCities.has(input.city.trim().toUpperCase())) {
    score += 30;
  }

  if (input.geoConfidence === "high") {
    score += 25;
  } else if (input.geoConfidence === "medium") {
    score += 15;
  }

  if (input.hasRecentReport) {
    score += 20;
  }

  if ((input.reportCount ?? 0) > 0) {
    score += Math.min(20, (input.reportCount ?? 0) * 2);
  }

  if (input.isReviewed) {
    score += 10;
  }

  return Math.min(100, score);
}
