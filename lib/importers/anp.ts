import type { NormalizedStationRecord } from "@/lib/normalizers/stations";
import {
  buildStationFallbackKey,
  deriveGeoConfidence,
  deriveGeoSource,
  isValidCoordinate,
  normalizeComparableText,
  normalizeCoordinate,
  normalizeStationRecord
} from "@/lib/normalizers/stations";

export interface AnpStationImportResult {
  record: NormalizedStationRecord;
  raw: Record<string, unknown>;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  cnpj: ["cnpj", "cnpj_revenda", "numero_cnpj", "cnpj_da_revenda"],
  sourceId: ["codigo_revenda", "cod_revenda", "codigo", "codigoisimp", "autorizacao", "id_revenda", "identificador", "id"],
  name: ["razao_social", "razaosocial", "nome_fantasia", "nomefantasia", "nome_posto", "nome", "posto", "estabelecimento"],
  brand: ["bandeira", "marca", "nome_bandeira"],
  distributor_name: ["distribuidora", "nome_distribuidora", "razao_social_distribuidora"],
  address: ["logradouro", "endereco", "endereço", "rua", "via"],
  neighborhood: ["bairro", "distrito"],
  city: ["municipio", "município", "cidade"],
  lat: ["latitude", "lat"],
  lng: ["longitude", "longitute", "lon", "lng"],
  official_status: ["situacao", "situação", "situacao_cadastral", "status"],
  sigaf_status: ["sigaf", "status_sigaf", "situacao_sigaf"],
  products: ["produtos", "produto", "combustiveis", "combustíveis"],
  import_notes: ["observacao", "observações", "obs", "observacoes"],
  is_active: ["is_active", "ativo", "ativa"]
};

function normalizeHeader(value: string) {
  return normalizeComparableText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^-?\d+[.,]\d+$/.test(trimmed) || /^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed.replace(",", "."));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return trimmed;
}

function detectDelimiter(line: string) {
  const candidates = [";", ",", "\t", "|"] as const;
  let best = ";";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = line.split(candidate).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  return best;
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [] as Record<string, unknown>[];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    return headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = parseValue(values[index] ?? "");
      return acc;
    }, {});
  });
}

function flattenObjects(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const key of ["items", "data", "rows", "stations", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        return flattenObjects(value);
      }
    }
  }

  return [];
}

function pickField(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (normalizedAlias in row) {
      return row[normalizedAlias];
    }
  }

  return undefined;
}

export function parseAnpStationsPayload(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return [] as AnpStationImportResult[];
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    return flattenObjects(parsed).map((raw) => ({ record: normalizeAnpStationRow(raw), raw }));
  }

  return parseCsvText(trimmed).map((raw) => ({ record: normalizeAnpStationRow(raw), raw }));
}

export function normalizeAnpStationRow(raw: Record<string, unknown>): NormalizedStationRecord {
  const row = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [normalizeHeader(key), value])
  ) as Record<string, unknown>;

  const lat = normalizeCoordinate(pickField(row, COLUMN_ALIASES.lat));
  const lng = normalizeCoordinate(pickField(row, COLUMN_ALIASES.lng));

  const normalized = {
    cnpj: pickField(row, COLUMN_ALIASES.cnpj),
    source: "anp",
    sourceId: String(pickField(row, COLUMN_ALIASES.sourceId) ?? "").trim() || null,
    name: String(pickField(row, COLUMN_ALIASES.name) ?? "").trim(),
    brand: String(pickField(row, COLUMN_ALIASES.brand) ?? "").trim(),
    address: String(pickField(row, COLUMN_ALIASES.address) ?? "").trim(),
    city: String(pickField(row, COLUMN_ALIASES.city) ?? "").trim(),
    neighborhood: String(pickField(row, COLUMN_ALIASES.neighborhood) ?? "").trim(),
    lat,
    lng,
    isActive: true,
    officialStatus: String(pickField(row, COLUMN_ALIASES.official_status) ?? "").trim() || "Desconhecido",
    sigafStatus: String(pickField(row, COLUMN_ALIASES.sigaf_status) ?? "").trim() || null,
    products: String(pickField(row, COLUMN_ALIASES.products) ?? "")
      .split(/[;,/|]+/)
      .map((item) => item.trim())
      .filter(Boolean),
    distributorName: String(pickField(row, COLUMN_ALIASES.distributor_name) ?? "").trim() || null,
    importNotes: String(pickField(row, COLUMN_ALIASES.import_notes) ?? "").trim() || null,
    geoSource: deriveGeoSource(lat, lng, "anp"),
    geoConfidence: deriveGeoConfidence(isValidCoordinate(lat, lng), false)
  };

  return normalizeStationRecord(normalized);
}

export function buildAnpStationFallbackKey(record: NormalizedStationRecord) {
  return buildStationFallbackKey({
    name: record.name,
    address: record.address,
    city: record.city,
    neighborhood: record.neighborhood
  });
}

export function isTargetCity(record: NormalizedStationRecord, cities: string[]) {
  if (cities.length === 0) {
    return true;
  }

  return cities.some((city) => normalizeComparableText(city) === normalizeComparableText(record.city));
}

