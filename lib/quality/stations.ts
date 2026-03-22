import type { Station, StationWithReports } from "@/lib/types";

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

export function formatStationDisplayName(name: string) {
  const cleaned = normalizeStationPublicName(name);
  if (!cleaned) {
    return "Posto";
  }

  return cleaned
    .split(" ")
    .map((part) => {
      const token = part.trim();
      if (!token) return token;
      if (/^[A-Z0-9&.-]{2,5}$/.test(token) && token === token.toUpperCase()) {
        return token.toUpperCase();
      }

      const lower = token.toLowerCase();
      return lower.slice(0, 1).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getStationPublicName(station: Pick<Station, "name" | "namePublic">) {
  return station.namePublic?.trim() || formatStationDisplayName(station.name);
}

export function detectGenericStationName(name: string) {
  const normalized = normalizeStationPublicName(name).toLowerCase();
  return /^(posto|auto posto|combust[íi]veis?|gasolina|revenda|posto de combust[íi]vel|posto combust[íi]vel)$/i.test(normalized) || normalized.length < 4;
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
