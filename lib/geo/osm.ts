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

export function buildNominatimQueries(input: { name: string; address: string; neighborhood: string; city: string }) {
  return [
    [input.name, input.address, input.neighborhood, input.city, "Brasil"],
    [input.address, input.neighborhood, input.city, "Brasil"],
    [input.address, input.city, "Brasil"],
    [input.city, "Brasil"]
  ].map((parts) =>
    parts
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(", ")
  );
}

export function hasValidCoordinates(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export async function geocodeWithNominatim(input: { name: string; address: string; neighborhood: string; city: string }, signal?: AbortSignal): Promise<OsmGeocodeResult | null> {
  const queries = buildNominatimQueries(input);

  for (const query of queries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": buildUserAgent(),
        Accept: "application/json"
      },
      signal
    });

    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string; importance?: number }>;
    const top = data[0];

    if (!top?.lat || !top.lon) {
      continue;
    }

    const importance = top.importance ?? 0.2;
    const confidence = importance >= 0.7 ? "high" : importance >= 0.4 ? "medium" : "low";

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


