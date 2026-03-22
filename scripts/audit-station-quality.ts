import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Pool } from "pg";

import { computeStationPriorityScore, detectGenericStationName, isValidStationCoordinate, normalizeStationPublicName } from "../lib/quality/stations";

interface CliOptions {
  apply: boolean;
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
  visibility_status: string | null;
  priority_score: number | null;
  cnpj: string | null;
  source: string | null;
  source_id: string | null;
  official_status: string | null;
  products: string[] | null;
  distributor_name: string | null;
  last_synced_at: string | null;
  updated_at: string | null;
}

interface StationReportAgg {
  station_id: string;
  report_count: number;
  latest_reported_at: string | null;
}

interface StationIssue {
  id: string;
  city: string;
  name: string;
  issue: string;
  severity: "high" | "medium" | "low";
  note: string;
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
    reportFile: "",
    cities: ["Volta Redonda", "Barra Mansa", "Resende", "Pinheiral", "Porto Real", "Quatis", "Barra do Piraí"]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--apply") {
      options.apply = true;
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

async function loadStations(pool: Pool, cities: string[]) {
  const normalizedCities = cities.map((city) => city.trim().toLowerCase());
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
        visibility_status,
        priority_score,
        cnpj,
        source,
        source_id,
        official_status,
        products,
        distributor_name,
        last_synced_at,
        updated_at
      from public.stations
      where lower(city) = any($1::text[])
    `,
    [normalizedCities]
  );

  return rows;
}

async function loadReportAgg(pool: Pool, stationIds: string[]) {
  if (stationIds.length === 0) return new Map<string, StationReportAgg>();

  const { rows } = await pool.query<StationReportAgg>(
    `
      select station_id, count(*)::int as report_count, max(reported_at) as latest_reported_at
      from public.price_reports
      where status = 'approved'
        and station_id = any($1::uuid[])
      group by station_id
    `,
    [stationIds]
  );

  return new Map(rows.map((row) => [row.station_id, row] as const));
}

function normalizeKey(station: Pick<StationLite, "name" | "address" | "city" | "neighborhood">) {
  return [station.name, station.address, station.city, station.neighborhood]
    .map((part) => normalizeStationPublicName(part ?? "").toLowerCase())
    .join("|");
}

function buildIssues(stations: StationLite[]) {
  const issues: StationIssue[] = [];
  const byCnpj = new Map<string, StationLite[]>();
  const byFallback = new Map<string, StationLite[]>();
  const seenIds = new Set<string>();

  for (const station of stations) {
    if (station.cnpj) {
      const list = byCnpj.get(station.cnpj) ?? [];
      list.push(station);
      byCnpj.set(station.cnpj, list);
    }

    const fallbackKey = normalizeKey(station);
    const fallbackList = byFallback.get(fallbackKey) ?? [];
    fallbackList.push(station);
    byFallback.set(fallbackKey, fallbackList);

    const invalidCoordinate = !isValidStationCoordinate(station.lat, station.lng);
    if (invalidCoordinate) {
      issues.push({
        id: station.id,
        city: station.city,
        name: station.name,
        issue: "coord_missing",
        severity: "high",
        note: "Sem coordenada confiável"
      });
    }

    if ((station.geo_confidence ?? "low") === "low") {
      issues.push({
        id: station.id,
        city: station.city,
        name: station.name,
        issue: "geo_low_confidence",
        severity: "medium",
        note: "geo_confidence baixa"
      });
    }

    if (detectGenericStationName(station.name)) {
      issues.push({
        id: station.id,
        city: station.city,
        name: station.name,
        issue: "generic_name",
        severity: "low",
        note: "Nome muito genérico"
      });
    }

    if (station.address.trim().length < 8 || /^(s\/n|sn|sem numero|sem número)$/i.test(station.address.trim())) {
      issues.push({
        id: station.id,
        city: station.city,
        name: station.name,
        issue: "incomplete_address",
        severity: "low",
        note: "Endereço incompleto ou pouco específico"
      });
    }
  }

  for (const [cnpj, list] of byCnpj.entries()) {
    if (list.length > 1) {
      for (const station of list) {
        if (seenIds.has(`${station.id}:cnpj`)) continue;
        seenIds.add(`${station.id}:cnpj`);
        issues.push({
          id: station.id,
          city: station.city,
          name: station.name,
          issue: "duplicate_cnpj",
          severity: "high",
          note: `CNPJ repetido (${cnpj})`
        });
      }
    }
  }

  for (const [key, list] of byFallback.entries()) {
    if (list.length > 1) {
      for (const station of list) {
        if (seenIds.has(`${station.id}:fallback`)) continue;
        seenIds.add(`${station.id}:fallback`);
        issues.push({
          id: station.id,
          city: station.city,
          name: station.name,
          issue: "duplicate_fallback",
          severity: "medium",
          note: `Possível duplicado por nome/endereço (${key})`
        });
      }
    }
  }

  return issues;
}

async function updateStationCuration(pool: Pool, stations: StationLite[], reportAgg: Map<string, StationReportAgg>) {
  for (const station of stations) {
    const isValidCoord = isValidStationCoordinate(station.lat, station.lng);
    const report = reportAgg.get(station.id);
    const namePublic = normalizeStationPublicName(station.name);
    const priorityScore = computeStationPriorityScore({
      city: station.city,
      geoConfidence: station.geo_confidence,
      hasRecentReport: Boolean(report?.latest_reported_at),
      reportCount: report?.report_count ?? 0,
      isReviewed: isValidCoord
    });
    const geoReviewStatus = !isValidCoord
      ? "manual_review"
      : (station.geo_confidence ?? "low") === "low"
        ? "pending"
        : "ok";
    const visibilityStatus = !isValidCoord ? "review" : "public";
    const note = !isValidCoord
      ? "Localização sem coordenada confiável."
      : (station.geo_confidence ?? "low") === "low"
        ? "Coordenada precisa de confirmação manual."
        : null;

    await pool.query(
      `
        update public.stations
        set
          name_official = coalesce(name_official, name),
          name_public = $1,
          geo_review_status = $2,
          visibility_status = $3,
          priority_score = $4,
          curation_note = $5,
          coordinate_reviewed_at = case when $2 = 'ok' then timezone('utc', now()) else coordinate_reviewed_at end,
          updated_at = timezone('utc', now())
        where id = $6
      `,
      [namePublic, geoReviewStatus, visibilityStatus, priorityScore, note, station.id]
    );
  }
}

function buildReportPath(path?: string) {
  if (path) return path;
  return `reports/station-curation-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
}

function countBy<T extends Record<string, unknown>>(rows: T[], field: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row[field] ?? "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

async function writeReport(path: string, summary: Record<string, unknown>, issues: StationIssue[]) {
  const lines = [
    "# Curadoria territorial da base",
    "",
    ...Object.entries(summary).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`),
    "",
    "## Suspeitos",
    ""
  ];

  for (const issue of issues.slice(0, 40)) {
    lines.push(`- ${issue.city} · ${issue.name} · ${issue.issue} · ${issue.note}`);
  }

  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(resolve(path), lines.join("\n"), "utf8");
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  const pool = createPool();

  try {
    await bootstrapSchema(pool);
    const stations = await loadStations(pool, options.cities);
    const reportAgg = await loadReportAgg(pool, stations.map((station) => station.id));
    const issues = buildIssues(stations);

    const summary = {
      cities: options.cities,
      totalStations: stations.length,
      validCoordinates: stations.filter((station) => isValidStationCoordinate(station.lat, station.lng)).length,
      invalidCoordinates: stations.filter((station) => !isValidStationCoordinate(station.lat, station.lng)).length,
      lowConfidence: stations.filter((station) => (station.geo_confidence ?? "low") === "low").length,
      manualReview: stations.filter((station) => station.geo_review_status !== "ok").length,
      genericNames: issues.filter((issue) => issue.issue === "generic_name").length,
      incompleteAddresses: issues.filter((issue) => issue.issue === "incomplete_address").length,
      duplicateSuspects: issues.filter((issue) => issue.issue === "duplicate_cnpj" || issue.issue === "duplicate_fallback").length,
      reviewIssues: issues.length
    };

    if (options.apply) {
      await updateStationCuration(pool, stations, reportAgg);
    }

    await writeReport(buildReportPath(options.reportFile), summary, issues);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


