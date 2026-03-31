import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { StationEditorTerritoryFilter } from "@/lib/ops/station-editors";

export interface StationLightEditRecord {
  id: string;
  stationId: string;
  stationName: string;
  editorId: string;
  editorEmail: string;
  changeKind: "light_edit" | "manual_review" | "duplicate_link";
  status: "saved" | "manual_review" | "duplicate_linked";
  duplicateOfStationId: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  diff: Record<string, { before: unknown; after: unknown }>;
  reason: string | null;
  createdAt: string;
}

export interface StationLightEditEditorSummary {
  editorId: string;
  editorEmail: string;
  totalCount: number;
  activeCount: number;
  reviewCount: number;
  duplicateCount: number;
  lastEditAt: string | null;
}

export interface StationLightEditAudit {
  totals: {
    totalCount: number;
    activeCount: number;
    reviewCount: number;
    duplicateCount: number;
  };
  editors: StationLightEditEditorSummary[];
  recent: StationLightEditRecord[];
}

type StationLightEditRow = {
  id: string;
  station_id: string;
  station_name: string;
  editor_id: string;
  editor_email: string;
  change_kind: "light_edit" | "manual_review" | "duplicate_link";
  status: "saved" | "manual_review" | "duplicate_linked";
  duplicate_of_station_id: string | null;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  diff: Record<string, { before: unknown; after: unknown }> | null;
  reason: string | null;
  created_at: string;
};

function mapEditRow(row: StationLightEditRow): StationLightEditRecord {
  return {
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    editorId: row.editor_id,
    editorEmail: row.editor_email,
    changeKind: row.change_kind,
    status: row.status,
    duplicateOfStationId: row.duplicate_of_station_id,
    beforeSnapshot: row.before_snapshot ?? {},
    afterSnapshot: row.after_snapshot ?? {},
    diff: row.diff ?? {},
    reason: row.reason,
    createdAt: row.created_at
  };
}

function buildEditorSummaries(records: StationLightEditRecord[]) {
  const map = new Map<string, StationLightEditEditorSummary>();

  for (const record of records) {
    const current = map.get(record.editorEmail) ?? {
      editorId: record.editorId,
      editorEmail: record.editorEmail,
      totalCount: 0,
      activeCount: 0,
      reviewCount: 0,
      duplicateCount: 0,
      lastEditAt: null
    };

    current.totalCount += 1;
    if (record.status === "saved") current.activeCount += 1;
    if (record.status === "manual_review") current.reviewCount += 1;
    if (record.status === "duplicate_linked") current.duplicateCount += 1;
    if (!current.lastEditAt || new Date(record.createdAt).getTime() > new Date(current.lastEditAt).getTime()) {
      current.lastEditAt = record.createdAt;
    }

    map.set(record.editorEmail, current);
  }

  return [...map.values()].sort((left, right) => right.totalCount - left.totalCount || left.editorEmail.localeCompare(right.editorEmail, "pt-BR"));
}

function normalizeTerritoryValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function territoryMatches(station: { city: string | null; neighborhood: string | null } | undefined, territory?: StationEditorTerritoryFilter) {
  if (!territory) return true;
  if (!station) return false;
  if (territory.city && normalizeTerritoryValue(station.city) !== normalizeTerritoryValue(territory.city)) return false;
  if (territory.neighborhood && normalizeTerritoryValue(station.neighborhood) !== normalizeTerritoryValue(territory.neighborhood)) return false;
  return true;
}

export async function getStationLightEditAudit(limit = 40, territory?: StationEditorTerritoryFilter): Promise<StationLightEditAudit> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("station_light_edits")
    .select("id,station_id,station_name,editor_id,editor_email,change_kind,status,duplicate_of_station_id,before_snapshot,after_snapshot,diff,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) {
      console.error("Failed to load station light edits", error);
    }
    return {
      totals: { totalCount: 0, activeCount: 0, reviewCount: 0, duplicateCount: 0 },
      editors: [],
      recent: []
    };
  }

  const stationIds = Array.from(new Set((data as StationLightEditRow[]).map((row) => row.station_id).filter(Boolean)));
  const { data: stationRows, error: stationError } = stationIds.length > 0
    ? await supabase
        .from("stations")
        .select("id,city,neighborhood")
        .in("id", stationIds)
    : { data: [], error: null };

  if (stationError) {
    console.error("Failed to load station light edit stations", stationError);
  }

  const stationMap = new Map<string, { city: string | null; neighborhood: string | null }>();
  for (const row of (stationRows ?? []) as Array<{ id: string; city: string | null; neighborhood: string | null }>) {
    stationMap.set(row.id, { city: row.city, neighborhood: row.neighborhood });
  }

  const recent = (data as StationLightEditRow[])
    .map(mapEditRow)
    .filter((record) => territoryMatches(stationMap.get(record.stationId), territory));
  const editors = buildEditorSummaries(recent);

  return {
    totals: {
      totalCount: recent.length,
      activeCount: recent.filter((item) => item.status === "saved").length,
      reviewCount: recent.filter((item) => item.status === "manual_review").length,
      duplicateCount: recent.filter((item) => item.status === "duplicate_linked").length
    },
    editors,
    recent
  };
}

export async function recordStationLightEdit(input: {
  stationId: string;
  stationName: string;
  editorId: string;
  editorEmail: string;
  changeKind: "light_edit" | "manual_review" | "duplicate_link";
  status: "saved" | "manual_review" | "duplicate_linked";
  duplicateOfStationId?: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  diff: Record<string, { before: unknown; after: unknown }>;
  reason?: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("station_light_edits").insert({
    station_id: input.stationId,
    station_name: input.stationName,
    editor_id: input.editorId,
    editor_email: input.editorEmail,
    change_kind: input.changeKind,
    status: input.status,
    duplicate_of_station_id: input.duplicateOfStationId ?? null,
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot,
    diff: input.diff,
    reason: input.reason ?? null
  });

  if (error) {
    console.error("Failed to record station light edit", error);
  }
}
