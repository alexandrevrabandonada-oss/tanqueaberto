import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Pool } from "pg";

import { buildStationFallbackKey, normalizeComparableText } from "../lib/normalizers/stations";
import { geocodeWithNominatim } from "../lib/geo/osm";
import { detectGenericStationName, formatStationDisplayName } from "../lib/quality/stations";

interface CliOptions {
  apply: boolean;
  dryRun: boolean;
  offline: boolean;
  cacheFile: string;
  reportFile: string;
  cities: string[];
}

interface StationLite {
  id: string;
  name: string;
  name_public: string | null;
  name_official: string | null;
  brand: string;
  address: string;
  city: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  geo_confidence: string | null;
  geo_review_status: string | null;
  geo_source: string | null;
  visibility_status: string | null;
  curation_note: string | null;
}

interface CachedGeoResult {
  lat: number;
  lng: number;
  confidence: "high" | "medium" | "low";
}

interface RegeoEvent {
  city: string;
  name: string;
  status: "resolved" | "pending" | "manual_review";
  confidence: "high" | "medium" | "low" | "none";
  source: "cache" | "osm" | "none";
}

function loadLocalEnv() {
  if (!existsSync(".env.local")) {
    return;
  }

  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    dryRun: false,
    offline: process.env.OSM_GEOCODE_OFFLINE === "1",
    cacheFile: "scripts/cache/anp-geocode-cache.json",
    reportFile: "",
    cities: ["Volta Redonda", "Barra Mansa", "Resende", "Barra do Piraí", "Porto Real", "Quatis", "Pinheiral"]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--apply") {
      options.apply = true;
      continue;
    }

    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (current === "--offline") {
      options.offline = true;
      continue;
    }

    if (current === "--cache-file" && next) {
      options.cacheFile = next;
      index += 1;
      continue;
    }

    if (current === "--report" && next) {
      options.reportFile = next;
      index += 1;
      continue;
    }

    if (current === "--cities" && next) {
      options.cities = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
  }

  return options;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !password) {
    throw new Error("Missing DATABASE_URL, SUPABASE_DB_URL or SUPABASE_DB_PASSWORD.");
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const dbHost = process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`;

  return `postgresql://postgres:${encodeURIComponent(password)}@${dbHost}:5432/postgres`;
}

function createPool() {
  return new Pool({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
}

async function bootstrapSchema(pool: Pool) {
  const { rows } = await pool.query<{ exists: boolean }>("select to_regclass('public.stations') is not null as exists");
  if (!rows[0]?.exists) {
    const initSql = await readFile(resolve("supabase/migrations/20260322_001_init.sql"), "utf8");
    await pool.query(initSql);
  }

  const ingestSql = await readFile(resolve("supabase/migrations/20260322_004_station_ingest.sql"), "utf8");
  await pool.query(ingestSql);
  const curationSql = await readFile(resolve("supabase/migrations/20260322_005_station_curation.sql"), "utf8");
  await pool.query(curationSql);
}

async function loadGeoCache(cacheFile: string) {
  try {
    const text = await readFile(resolve(cacheFile), "utf8");
    return new Map<string, CachedGeoResult>(Object.entries(JSON.parse(text)));
  } catch {
    return new Map<string, CachedGeoResult>();
  }
}

async function saveGeoCache(cacheFile: string, cache: Map<string, CachedGeoResult>) {
  await mkdir(resolve(cacheFile, ".."), { recursive: true });
  await writeFile(resolve(cacheFile), JSON.stringify(Object.fromEntries(cache.entries()), null, 2), "utf8");
}

function normalizeCity(value: string) {
  return normalizeComparableText(value);
}

async function loadStations(pool: Pool, cities: string[]) {
  const normalizedCities = cities.map(normalizeCity);
  const { rows } = await pool.query<StationLite>(
    `
      select
        id,
        name,
        name_public,
        name_official,
        brand,
        address,
        city,
        neighborhood,
        lat,
        lng,
        geo_confidence,
        geo_review_status,
        geo_source,
        visibility_status,
        curation_note
      from public.stations
      where translate(lower(city), 'áàãâäéèêëíìîïóòôöúùûüç', 'aaaaaeeeeiiiioooouuuuc') = any($1::text[])
        and (
          lat is null or lng is null or lat = 0 or lng = 0
          or lat not between -90 and 90 or lng not between -180 and 180
        )
      order by priority_score desc, city asc, name asc
    `,
    [normalizedCities]
  );

  return rows;
}

function buildGeoCacheKey(station: StationLite) {
  return buildStationFallbackKey({
    name: station.name,
    address: station.address,
    city: station.city,
    neighborhood: station.neighborhood
  });
}

function buildGeoCacheSuffixKey(station: StationLite) {
  return [station.address, station.city, station.neighborhood].map((part) => normalizeComparableText(part)).join("|");
}

function findCachedGeo(station: StationLite, cache: Map<string, CachedGeoResult>) {
  const direct = cache.get(buildGeoCacheKey(station));
  if (direct) {
    return direct;
  }

  const suffix = buildGeoCacheSuffixKey(station);
  for (const [key, value] of cache.entries()) {
    if (key.endsWith(`|${suffix}`)) {
      return value;
    }
  }

  return null;
}

function buildDisplayName(station: StationLite) {
  return formatStationDisplayName(station.name_public ?? station.name_official ?? station.name);
}

function needsNameNormalization(station: StationLite) {
  if (!station.name_public) {
    return true;
  }

  if (detectGenericStationName(station.name_public)) {
    return true;
  }

  return station.name_public.trim() === station.name.trim();
}

function resolveGeoState(confidence: "high" | "medium" | "low" | null): { status: "resolved" | "pending" | "manual_review"; confidence: "high" | "medium" | "low" | "none" } {
  if (confidence === "high") {
    return { status: "resolved", confidence: "high" };
  }

  if (confidence === "medium") {
    return { status: "pending", confidence: "medium" };
  }

  if (confidence === "low") {
    return { status: "manual_review", confidence: "low" };
  }

  return { status: "manual_review", confidence: "none" };
}

function buildReportPath(path?: string) {
  if (path) {
    return path;
  }

  return `reports/territorial-geo-recheck-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
}

async function writeReport(path: string, summary: Record<string, unknown>, events: RegeoEvent[]) {
  const lines = [
    "# Segunda curadoria geográfica",
    "",
    ...Object.entries(summary).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`),
    "",
    "## Amostras",
    ""
  ];

  for (const event of events.slice(0, 40)) {
    lines.push(`- ${event.city} · ${event.name} · ${event.status} · ${event.confidence} · ${event.source}`);
  }

  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(resolve(path), lines.join("\n"), "utf8");
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  const pool = createPool();
  const cache = await loadGeoCache(options.cacheFile);
  const events: RegeoEvent[] = [];

  try {
    await bootstrapSchema(pool);
    const stations = await loadStations(pool, options.cities);

    let resolved = 0;
    let pending = 0;
    let manualReview = 0;
    let normalizedNames = 0;
    let cacheHits = 0;

    for (const station of stations) {
      const cacheKey = buildGeoCacheKey(station);
      const cached = findCachedGeo(station, cache);
      let geo: CachedGeoResult | null = cached ?? null;

      if (geo) {
        cacheHits += 1;
      }

      if (!geo && !options.offline) {
        const fetched = await geocodeWithNominatim({
          name: buildDisplayName(station),
          address: station.address,
          neighborhood: station.neighborhood,
          city: station.city
        });

        if (fetched) {
          geo = {
            lat: fetched.lat,
            lng: fetched.lng,
            confidence: fetched.confidence
          };
          cache.set(cacheKey, geo);
        }
      }

      const namePublic = needsNameNormalization(station) ? buildDisplayName(station) : null;
      if (namePublic) {
        normalizedNames += 1;
      }

      const geoState = resolveGeoState(geo?.confidence ?? null);
      if (geoState.status === "resolved") {
        resolved += 1;
      } else if (geoState.status === "pending") {
        pending += 1;
      } else {
        manualReview += 1;
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        coordinate_reviewed_at: new Date().toISOString(),
        name_public: namePublic,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        geo_source: geo ? "osm" : station.geo_source ?? null,
        geo_confidence: geo?.confidence ?? station.geo_confidence ?? null,
        geo_review_status: geoState.status,
        visibility_status: geoState.status === "manual_review" ? "review" : "public"
      };

      if (!options.dryRun && options.apply) {
        await pool.query(
          `
            update public.stations
            set
              name_public = coalesce($1, name_public),
              lat = coalesce($2, lat),
              lng = coalesce($3, lng),
              geo_source = coalesce($4, geo_source),
              geo_confidence = coalesce($5, geo_confidence),
              geo_review_status = coalesce($6, geo_review_status),
              visibility_status = coalesce($7, visibility_status),
              coordinate_reviewed_at = $8,
              updated_at = $8
            where id = $9
          `,
          [
            updatePayload.name_public ?? null,
            updatePayload.lat ?? null,
            updatePayload.lng ?? null,
            updatePayload.geo_source ?? null,
            updatePayload.geo_confidence ?? null,
            updatePayload.geo_review_status ?? null,
            updatePayload.visibility_status ?? null,
            updatePayload.coordinate_reviewed_at,
            station.id
          ]
        );
      }

      events.push({
        city: station.city,
        name: namePublic ?? buildDisplayName(station),
        status: geoState.status,
        confidence: geoState.confidence,
        source: geo ? (geo === cached ? "cache" : "osm") : "none"
      });
    }

    await saveGeoCache(options.cacheFile, cache);

    const summary = {
      cities: options.cities,
      selectedStations: stations.length,
      cacheHits,
      resolved,
      pending,
      manualReview,
      normalizedNames,
      dryRun: options.dryRun,
      apply: options.apply,
      offline: options.offline
    };

    await writeReport(buildReportPath(options.reportFile), summary, events);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


