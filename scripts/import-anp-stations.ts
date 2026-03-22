import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Pool } from "pg";

import { buildAnpStationFallbackKey, isTargetCity, parseAnpStationsPayload } from "../lib/importers/anp";
import { geocodeWithNominatim, hasValidCoordinates } from "../lib/geo/osm";
import type { NormalizedStationRecord } from "../lib/normalizers/stations";
import { normalizeComparableText } from "../lib/normalizers/stations";

interface CliOptions {
  file?: string;
  url?: string;
  cities: string[];
  dryRun: boolean;
  enrichGeo: boolean;
  cacheFile: string;
  reportFile: string;
  maxConflicts: number;
}

interface StationRowLite {
  id: string;
  cnpj: string | null;
  source: string;
  source_id: string | null;
  name: string;
  brand: string;
  address: string;
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  geo_source: string;
  geo_confidence: string;
  official_status: string;
  sigaf_status: string | null;
  distributor_name: string | null;
  products: string[] | null;
  is_active: boolean;
}

interface ImportEvent {
  city: string;
  status: "created" | "updated" | "ignored" | "conflict" | "missing_coordinate";
  key: string;
  reason?: string;
}

interface ImportSummary {
  file: string;
  cities: string[];
  totalRead: number;
  totalMatchedCities: number;
  created: number;
  updated: number;
  ignored: number;
  conflicts: number;
  missingCoordinate: number;
  geocoded: number;
  dryRun: boolean;
  events: ImportEvent[];
}

const DEFAULT_CITIES = ["Volta Redonda", "Barra Mansa", "Resende", "Pinheiral", "Porto Real", "Quatis", "Barra do Piraí"];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    cities: [],
    dryRun: false,
    enrichGeo: false,
    cacheFile: "scripts/cache/anp-geocode-cache.json",
    reportFile: "",
    maxConflicts: 25
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--file" && next) {
      options.file = next;
      index += 1;
      continue;
    }

    if (current === "--url" && next) {
      options.url = next;
      index += 1;
      continue;
    }

    if (current === "--cities" && next) {
      options.cities = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (current === "--enrich-geo") {
      options.enrichGeo = true;
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

    if (current === "--max-conflicts" && next) {
      options.maxConflicts = Number(next) || options.maxConflicts;
      index += 1;
    }
  }

  return options;
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

async function loadSourceText(options: CliOptions) {
  if (options.file) {
    return readFile(resolve(options.file), "utf8");
  }

  if (options.url) {
    const response = await fetch(options.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ANP source: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  throw new Error("Use --file or --url to provide the ANP source file.");
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

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
  return new Pool({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });
}

async function bootstrapSchema(pool: Pool) {
  const { rows } = await pool.query<{ exists: boolean }>("select to_regclass('public.stations') is not null as exists");
  const stationsExist = rows[0]?.exists ?? false;

  if (!stationsExist) {
    const initSql = await readFile(resolve("supabase/migrations/20260322_001_init.sql"), "utf8");
    await pool.query(initSql);
  }

  const ingestSql = await readFile(resolve("supabase/migrations/20260322_004_station_ingest.sql"), "utf8");
  await pool.query(ingestSql);
}

async function loadGeoCache(cacheFile: string) {
  try {
    const text = await readFile(resolve(cacheFile), "utf8");
    return new Map<string, { lat: number; lng: number; confidence: "high" | "medium" | "low" }>(Object.entries(JSON.parse(text)));
  } catch {
    return new Map<string, { lat: number; lng: number; confidence: "high" | "medium" | "low" }>();
  }
}

async function saveGeoCache(cacheFile: string, cache: Map<string, { lat: number; lng: number; confidence: "high" | "medium" | "low" }>) {
  await mkdir(resolve(cacheFile, ".."), { recursive: true });
  await writeFile(resolve(cacheFile), JSON.stringify(Object.fromEntries(cache.entries()), null, 2), "utf8");
}

function normalizeRowForCompare(row: Pick<StationRowLite, "name" | "address" | "city" | "neighborhood">) {
  return {
    name: normalizeComparableText(row.name),
    address: normalizeComparableText(row.address),
    city: normalizeComparableText(row.city),
    neighborhood: normalizeComparableText(row.neighborhood)
  };
}

function hasMeaningfulChanges(existing: StationRowLite, payload: Record<string, unknown>) {
  return [
    [existing.name, payload.name],
    [existing.brand, payload.brand],
    [existing.address, payload.address],
    [existing.city, payload.city],
    [existing.neighborhood, payload.neighborhood],
    [existing.lat, payload.lat],
    [existing.lng, payload.lng],
    [existing.geo_source, payload.geo_source],
    [existing.geo_confidence, payload.geo_confidence],
    [existing.official_status, payload.official_status],
    [existing.sigaf_status, payload.sigaf_status],
    [JSON.stringify(existing.products ?? []), JSON.stringify(payload.products ?? [])],
    [existing.is_active, payload.is_active]
  ].some(([left, right]) => String(left) !== String(right));
}

function buildStationKey(record: NormalizedStationRecord) {
  return record.cnpj || record.sourceId || buildAnpStationFallbackKey(record);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeEnrichGeo(
  record: NormalizedStationRecord,
  options: CliOptions,
  cache: Map<string, { lat: number; lng: number; confidence: "high" | "medium" | "low" }>
) {
  if (hasValidCoordinates(record.lat, record.lng) || !options.enrichGeo) {
    return { record, geocoded: false };
  }

  const key = buildAnpStationFallbackKey(record);
  const cached = cache.get(key);
  if (cached) {
    return {
      record: {
        ...record,
        lat: cached.lat,
        lng: cached.lng,
        geoSource: "osm" as const,
        geoConfidence: cached.confidence
      },
      geocoded: true
    };
  }

  await sleep(1100);

  const geo = await geocodeWithNominatim({
    name: record.name,
    address: record.address,
    neighborhood: record.neighborhood,
    city: record.city
  });

  if (!geo) {
    return { record, geocoded: false };
  }

  cache.set(key, { lat: geo.lat, lng: geo.lng, confidence: geo.confidence });

  return {
    record: {
      ...record,
      lat: geo.lat,
      lng: geo.lng,
      geoSource: geo.source,
      geoConfidence: geo.confidence
    },
    geocoded: true
  };
}

function serializeProducts(products: string[] | null | undefined) {
  return JSON.stringify(products ?? []);
}

async function loadExistingStations(pool: Pool, cities: string[]) {
  const normalizedCities = cities.map((city) => normalizeComparableText(city));
  const { rows } = await pool.query<StationRowLite>(
    `
      select
        id,
        cnpj,
        source,
        source_id,
        name,
        brand,
        address,
        city,
        neighborhood,
        lat,
        lng,
        geo_source,
        geo_confidence,
        official_status,
        sigaf_status,
        distributor_name,
        products,
        is_active
      from public.stations
      where lower(city) = any($1::text[])
    `,
    [normalizedCities]
  );

  return rows;
}

async function upsertStation(pool: Pool, existing: StationRowLite | null, payload: Record<string, unknown>) {
  if (existing) {
    await pool.query(
      `
        update public.stations
        set
          cnpj = $1,
          source = $2,
          source_id = $3,
          name = $4,
          brand = $5,
          address = $6,
          city = $7,
          neighborhood = $8,
          lat = $9,
          lng = $10,
          is_active = $11,
          official_status = $12,
          sigaf_status = $13,
          products = $14,
          distributor_name = $15,
          last_synced_at = $16,
          import_notes = $17,
          geo_source = $18,
          geo_confidence = $19,
          updated_at = $20
        where id = $21
      `,
      [
        payload.cnpj,
        payload.source,
        payload.source_id,
        payload.name,
        payload.brand,
        payload.address,
        payload.city,
        payload.neighborhood,
        payload.lat,
        payload.lng,
        payload.is_active,
        payload.official_status,
        payload.sigaf_status,
        payload.products,
        payload.distributor_name,
        payload.last_synced_at,
        payload.import_notes,
        payload.geo_source,
        payload.geo_confidence,
        payload.updated_at,
        existing.id
      ]
    );
    return "updated" as const;
  }

  await pool.query(
    `
      insert into public.stations (
        cnpj,
        source,
        source_id,
        name,
        brand,
        address,
        city,
        neighborhood,
        lat,
        lng,
        is_active,
        official_status,
        sigaf_status,
        products,
        distributor_name,
        last_synced_at,
        import_notes,
        geo_source,
        geo_confidence,
        updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
    `,
    [
      payload.cnpj,
      payload.source,
      payload.source_id,
      payload.name,
      payload.brand,
      payload.address,
      payload.city,
      payload.neighborhood,
      payload.lat,
      payload.lng,
      payload.is_active,
      payload.official_status,
      payload.sigaf_status,
      payload.products,
      payload.distributor_name,
      payload.last_synced_at,
      payload.import_notes,
      payload.geo_source,
      payload.geo_confidence,
      payload.updated_at
    ]
  );

  return "created" as const;
}

function buildReportFilePath(options: CliOptions) {
  if (options.reportFile) {
    return options.reportFile;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `reports/anp-import-${timestamp}.md`;
}

async function writeReport(summary: ImportSummary, path: string) {
  const lines = [
    `# Importação ANP`,
    "",
    `- Arquivo: \`${summary.file}\``,
    `- Municípios: ${summary.cities.join(", ")}`,
    `- Linhas lidas: ${summary.totalRead}`,
    `- Linhas compatíveis com as cidades: ${summary.totalMatchedCities}`,
    `- Criados: ${summary.created}`,
    `- Atualizados: ${summary.updated}`,
    `- Ignorados: ${summary.ignored}`,
    `- Conflitos: ${summary.conflicts}`,
    `- Sem coordenada: ${summary.missingCoordinate}`,
    `- Geocodificados via OSM: ${summary.geocoded}`,
    `- Dry-run: ${summary.dryRun ? "sim" : "não"}`,
    "",
    `## Conflitos e pendências`,
    ""
  ];

  const conflictItems = summary.events.filter((event) => event.status === "conflict").slice(0, 40);
  if (conflictItems.length === 0) {
    lines.push("Nenhum conflito relevante registrado.");
  } else {
    for (const item of conflictItems) {
      lines.push(`- ${item.city}: ${item.key}${item.reason ? ` (${item.reason})` : ""}`);
    }
  }

  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(resolve(path), lines.join("\n"), "utf8");
}

function loadKeyMaps(rows: StationRowLite[]) {
  const byCnpj = new Map(rows.filter((row) => row.cnpj).map((row) => [row.cnpj as string, row] as const));
  const bySource = new Map(rows.filter((row) => row.source_id).map((row) => [`${row.source}:${row.source_id}`, row] as const));
  const byFallback = new Map(rows.map((row) => [JSON.stringify(normalizeRowForCompare(row)), row] as const));
  return { byCnpj, bySource, byFallback };
}

async function main() {
  loadLocalEnv();

  const options = parseArgs(process.argv.slice(2));
  const cities = options.cities.length > 0 ? options.cities : DEFAULT_CITIES;
  const sourceText = await loadSourceText(options);
  const parsed = parseAnpStationsPayload(sourceText);
  const imported = parsed.map((item) => item.record).filter((record) => isTargetCity(record, cities));
  const geoCache = await loadGeoCache(options.cacheFile);
  const pool = createPool();
  const events: ImportEvent[] = [];

  try {
    await bootstrapSchema(pool);
    const existingRows = await loadExistingStations(pool, cities);
    const { byCnpj, bySource, byFallback } = loadKeyMaps(existingRows);
    const seenKeys = new Set<string>();
    let created = 0;
    let updated = 0;
    let ignored = 0;
    let conflicts = 0;
    let missingCoordinate = 0;
    let geocoded = 0;

    for (const record of imported) {
      const enriched = await maybeEnrichGeo(record, options, geoCache);
      const current = enriched.record;
      const importKey = buildStationKey(current);

      if (seenKeys.has(importKey)) {
        ignored += 1;
        events.push({ city: current.city, status: "ignored", key: importKey, reason: "duplicado no arquivo" });
        continue;
      }

      seenKeys.add(importKey);

      if (enriched.geocoded) {
        geocoded += 1;
      }

      if (!hasValidCoordinates(current.lat, current.lng)) {
        missingCoordinate += 1;
        conflicts += 1;
        events.push({ city: current.city, status: "missing_coordinate", key: buildStationKey(current), reason: "sem coordenada confiável" });
        if (conflicts >= options.maxConflicts) {
          throw new Error(`Abortado: conflito excessivo (${conflicts}).`);
        }
        continue;
      }

      const payload = {
        cnpj: current.cnpj,
        source: current.source,
        source_id: current.sourceId,
        name: current.name,
        brand: current.brand,
        address: current.address,
        city: current.city,
        neighborhood: current.neighborhood,
        lat: current.lat,
        lng: current.lng,
        is_active: current.isActive,
        official_status: current.officialStatus,
        sigaf_status: current.sigafStatus,
        products: current.products,
        distributor_name: current.distributorName,
        last_synced_at: new Date().toISOString(),
        import_notes: current.importNotes,
        geo_source: current.geoSource,
        geo_confidence: current.geoConfidence,
        updated_at: new Date().toISOString()
      };

      const fallbackKey = JSON.stringify(normalizeRowForCompare(current));
      const existing = current.cnpj ? byCnpj.get(current.cnpj) : current.sourceId ? bySource.get(`${current.source}:${current.sourceId}`) : byFallback.get(fallbackKey);

      if (existing) {
        const changed = hasMeaningfulChanges(existing, payload);
        if (changed) {
          if (!options.dryRun) {
            await upsertStation(pool, existing, payload);
          }
          updated += 1;
          events.push({ city: current.city, status: "updated", key: buildStationKey(current) });
        } else {
          ignored += 1;
          events.push({ city: current.city, status: "ignored", key: buildStationKey(current), reason: "sem mudanças" });
        }
        continue;
      }

      const cnpjCollision = current.cnpj ? existingRows.find((row: StationRowLite) => row.cnpj === current.cnpj) : null;
      const sourceCollision = current.sourceId ? existingRows.find((row: StationRowLite) => row.source === current.source && row.source_id === current.sourceId) : null;
      const fallbackCollision = existingRows.find((row: StationRowLite) => JSON.stringify(normalizeRowForCompare(row)) === fallbackKey);
      const collision = cnpjCollision || sourceCollision || fallbackCollision;

      if (collision) {
        conflicts += 1;
        events.push({
          city: current.city,
          status: "conflict",
          key: buildStationKey(current),
          reason: cnpjCollision ? "cnpj duplicado" : sourceCollision ? "identificador oficial duplicado" : "fallback divergente"
        });
        if (conflicts >= options.maxConflicts) {
          throw new Error(`Abortado: conflito excessivo (${conflicts}).`);
        }
        continue;
      }

      if (!options.dryRun) {
        await upsertStation(pool, null, payload);
      }
      created += 1;
      events.push({ city: current.city, status: "created", key: buildStationKey(current) });
    }

    const summary: ImportSummary = {
      file: options.file ?? options.url ?? "unknown",
      cities,
      totalRead: parsed.length,
      totalMatchedCities: imported.length,
      created,
      updated,
      ignored,
      conflicts,
      missingCoordinate,
      geocoded,
      dryRun: options.dryRun,
      events
    };

    await saveGeoCache(options.cacheFile, geoCache);
    await writeReport(summary, buildReportFilePath(options));

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});







