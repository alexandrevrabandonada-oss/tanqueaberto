import { normalizeStationPublicName } from "@/lib/quality/stations";

export interface OsmGeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  confidence: "high" | "medium" | "low";
  source: "osm";
}

function buildUserAgent() {
  return process.env.OSM_NOMINATIM_USER_AGENT || "Bomba Aberta/1.0 (https://github.com/alexandrevrabandonada-oss/tanqueaberto)";
}

function normalizeQueryPart(value: string) {
  return normalizeStationPublicName(value)
    .replace(/\b(rj|rio de janeiro)\b/gi, "RJ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueQueries(queries: string[]) {
  return Array.from(new Set(queries.map((query) => query.trim()).filter(Boolean)));
}

export function buildNominatimQueries(input: { name: string; address: string; neighborhood: string; city: string }) {
  const city = normalizeQueryPart(input.city);
  const neighborhood = normalizeQueryPart(input.neighborhood);
  const address = normalizeQueryPart(input.address);
  const name = normalizeQueryPart(input.name);

  const addressFragments = address
    .replace(/\b(cidade|municipio|município)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const queries = [
    [name, addressFragments, city, "Brasil"],
    [name, neighborhood, city, "Brasil"],
    [addressFragments, city, "Brasil"],
    [addressFragments, neighborhood, city, "Brasil"],
    [neighborhood, city, "Brasil"],
    [city, "RJ", "Brasil"],
    [city, "posto de combustivel", "Brasil"]
  ].map((parts) =>
    parts
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(", ")
  );

  return uniqueQueries(queries);
}

export function hasValidCoordinates(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export async function geocodeWithNominatim(input: { name: string; address: string; neighborhood: string; city: string }, signal?: AbortSignal): Promise<OsmGeocodeResult | null> {
  const queries = buildNominatimQueries(input);

  for (const [index, query] of queries.entries()) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", query);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": buildUserAgent(),
          Accept: "application/json"
        },
        signal
      });
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    let data: Array<{ lat?: string; lon?: string; display_name?: string; importance?: number }>;

    try {
      data = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string; importance?: number }>;
    } catch {
      continue;
    }
    const top = data[0];

    if (!top?.lat || !top.lon) {
      continue;
    }

    const importance = top.importance ?? 0.2;
    const queryBonus = Math.max(0, 0.12 - index * 0.02);
    const adjustedScore = Math.min(1, importance + queryBonus);
    const confidence = adjustedScore >= 0.75 ? "high" : adjustedScore >= 0.45 ? "medium" : "low";

    return {
      lat: Number(top.lat),
      lng: Number(top.lon),
      displayName: top.display_name ?? query,
      confidence,
      source: "osm"
    };
  }

  return null;
}

