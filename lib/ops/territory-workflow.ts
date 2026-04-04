import { getAuditCitySlug } from "@/lib/audit/cities";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type TerritoryWorkflowState = "em_mutirao" | "em_acompanhamento" | "concluido_por_enquanto";
export type TerritoryWorkflowResponsibleRole = "station_editor" | "curadoria" | "operacao_admin";
export type TerritoryWorkflowDueKind = "hoje" | "esta_semana" | "sem_prazo";
export type TerritoryWorkflowBlockKind =
  | "aguardando_semeadura"
  | "aguardando_curadoria"
  | "aguardando_editor"
  | "sem_prioridade_agora";

export interface TerritoryWorkflowRecord {
  territoryKey: string;
  city: string;
  citySlug: string;
  neighborhood: string;
  workflowState: TerritoryWorkflowState;
  responsibleRole: TerritoryWorkflowResponsibleRole;
  responsibleName: string | null;
  dueKind: TerritoryWorkflowDueKind;
  dueAt: string | null;
  blockKind: TerritoryWorkflowBlockKind | null;
  note: string | null;
  followUpAt: string | null;
  actorId: string | null;
  actorEmail: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TerritoryWorkflowSummary {
  total: number;
  emMutirao: number;
  emAcompanhamento: number;
  concluidoPorEnquanto: number;
  prioritiesToday: number;
  acompanhamentoAtrasado: number;
  concluidoRecentemente: number;
  stationEditorResponsible: number;
  curadoriaResponsible: number;
  operacaoAdminResponsible: number;
  semResponsavel: number;
  dueToday: number;
  dueThisWeek: number;
  semPrazo: number;
  bloqueado: number;
  aguardandoSemeadura: number;
  aguardandoCuradoria: number;
  aguardandoEditor: number;
  semPrioridadeAgora: number;
  latestFollowUpAt: string | null;
  latestUpdatedAt: string | null;
}

export interface TerritoryWorkflowReadout {
  summary: TerritoryWorkflowSummary;
  records: TerritoryWorkflowRecord[];
}

export interface TerritoryWorkflowQueueReadout {
  summary: TerritoryWorkflowSummary;
  records: TerritoryWorkflowRecord[];
  prioritiesToday: TerritoryWorkflowRecord[];
  mutirao: TerritoryWorkflowRecord[];
  acompanhamentoAtrasado: TerritoryWorkflowRecord[];
  concluidoRecentemente: TerritoryWorkflowRecord[];
  bloqueiosCurtos: TerritoryWorkflowRecord[];
}

const TERRITORY_WORKFLOW_STATES: TerritoryWorkflowState[] = [
  "em_mutirao",
  "em_acompanhamento",
  "concluido_por_enquanto"
];

const TERRITORY_WORKFLOW_RESPONSIBLE_ROLES: TerritoryWorkflowResponsibleRole[] = [
  "station_editor",
  "curadoria",
  "operacao_admin"
];

const TERRITORY_WORKFLOW_DUE_KINDS: TerritoryWorkflowDueKind[] = ["hoje", "esta_semana", "sem_prazo"];
const TERRITORY_WORKFLOW_BLOCK_KINDS: TerritoryWorkflowBlockKind[] = [
  "aguardando_semeadura",
  "aguardando_curadoria",
  "aguardando_editor",
  "sem_prioridade_agora"
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function normalizeTerritoryValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeRole(value: string | null | undefined): TerritoryWorkflowResponsibleRole {
  if (value === "station_editor" || value === "curadoria" || value === "operacao_admin") {
    return value;
  }
  return "operacao_admin";
}

function normalizeDueKind(value: string | null | undefined): TerritoryWorkflowDueKind {
  if (value === "hoje" || value === "esta_semana" || value === "sem_prazo") {
    return value;
  }
  return "sem_prazo";
}

function normalizeBlockKind(value: string | null | undefined): TerritoryWorkflowBlockKind | null {
  if (
    value === "aguardando_semeadura" ||
    value === "aguardando_curadoria" ||
    value === "aguardando_editor" ||
    value === "sem_prioridade_agora"
  ) {
    return value;
  }
  return null;
}

function dueAtFromKind(kind: TerritoryWorkflowDueKind) {
  if (kind === "hoje") return new Date(Date.now() + DAY_MS).toISOString();
  if (kind === "esta_semana") return new Date(Date.now() + WEEK_MS).toISOString();
  return null;
}

function isTerritoryWorkflowOverdue(record: TerritoryWorkflowRecord, now = Date.now()) {
  return Boolean(record.dueAt && new Date(record.dueAt).getTime() < now && record.dueKind !== "sem_prazo");
}

function isTerritoryWorkflowRecent(record: TerritoryWorkflowRecord, now = Date.now()) {
  return now - new Date(record.updatedAt).getTime() <= WEEK_MS;
}

function hasTerritoryWorkflowBlock(record: TerritoryWorkflowRecord) {
  return Boolean(record.blockKind);
}

function queuePriorityScore(record: TerritoryWorkflowRecord, now = Date.now()) {
  if (record.workflowState === "em_acompanhamento" && isTerritoryWorkflowOverdue(record, now)) return 0;
  if (record.dueKind === "hoje") return 1;
  if (record.blockKind === "aguardando_semeadura") return 2;
  if (record.workflowState === "em_mutirao") return 3;
  if (record.blockKind === "aguardando_curadoria") return 4;
  if (record.dueKind === "esta_semana") return 5;
  if (record.blockKind === "aguardando_editor") return 6;
  if (record.workflowState === "concluido_por_enquanto" && isTerritoryWorkflowRecent(record, now)) return 7;
  if (record.blockKind === "sem_prioridade_agora") return 8;
  return 9;
}

function queueCompare(a: TerritoryWorkflowRecord, b: TerritoryWorkflowRecord) {
  const now = Date.now();
  const scoreA = queuePriorityScore(a, now);
  const scoreB = queuePriorityScore(b, now);
  if (scoreA !== scoreB) return scoreA - scoreB;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export function territoryWorkflowKey(city: string, neighborhood?: string | null) {
  return `${normalizeTerritoryValue(city)}::${normalizeTerritoryValue(neighborhood)}`;
}

export function territoryWorkflowLabel(state: TerritoryWorkflowState | null | undefined) {
  if (state === "em_mutirao") return "Em mutirão";
  if (state === "em_acompanhamento") return "Em acompanhamento";
  if (state === "concluido_por_enquanto") return "Concluído por enquanto";
  return "Sem marca";
}

export function territoryWorkflowShortLabel(state: TerritoryWorkflowState | null | undefined) {
  if (state === "em_mutirao") return "Mutirão";
  if (state === "em_acompanhamento") return "Acompanhamento";
  if (state === "concluido_por_enquanto") return "Concluído";
  return "Sem marca";
}

export function territoryWorkflowStateTone(state: TerritoryWorkflowState | null | undefined) {
  if (state === "em_mutirao") return "accent";
  if (state === "em_acompanhamento") return "warning";
  if (state === "concluido_por_enquanto") return "secondary";
  return "outline";
}

export function territoryWorkflowResponsibleLabel(role: TerritoryWorkflowResponsibleRole | null | undefined) {
  if (role === "station_editor") return "Station editor";
  if (role === "curadoria") return "Curadoria";
  if (role === "operacao_admin") return "Operação/Admin";
  return "Sem responsável";
}

export function territoryWorkflowResponsibleShortLabel(role: TerritoryWorkflowResponsibleRole | null | undefined) {
  if (role === "station_editor") return "Editor";
  if (role === "curadoria") return "Curadoria";
  if (role === "operacao_admin") return "Operação";
  return "Sem dono";
}

export function territoryWorkflowDueLabel(kind: TerritoryWorkflowDueKind | null | undefined) {
  if (kind === "hoje") return "Hoje";
  if (kind === "esta_semana") return "Esta semana";
  if (kind === "sem_prazo") return "Sem prazo";
  return "Sem prazo";
}

export function territoryWorkflowDueShortLabel(kind: TerritoryWorkflowDueKind | null | undefined) {
  if (kind === "hoje") return "Hoje";
  if (kind === "esta_semana") return "Semana";
  if (kind === "sem_prazo") return "Livre";
  return "Livre";
}

export function territoryWorkflowBlockLabel(kind: TerritoryWorkflowBlockKind | null | undefined) {
  if (kind === "aguardando_semeadura") return "Aguardando semeadura";
  if (kind === "aguardando_curadoria") return "Aguardando curadoria";
  if (kind === "aguardando_editor") return "Aguardando editor";
  if (kind === "sem_prioridade_agora") return "Sem prioridade agora";
  return "Sem bloqueio";
}

export function territoryWorkflowBlockShortLabel(kind: TerritoryWorkflowBlockKind | null | undefined) {
  if (kind === "aguardando_semeadura") return "Semeadura";
  if (kind === "aguardando_curadoria") return "Curadoria";
  if (kind === "aguardando_editor") return "Editor";
  if (kind === "sem_prioridade_agora") return "Baixa";
  return "Livre";
}

function dedupeLatest(records: TerritoryWorkflowRecord[]) {
  const map = new Map<string, TerritoryWorkflowRecord>();
  for (const record of records) {
    if (!map.has(record.territoryKey)) {
      map.set(record.territoryKey, record);
    }
  }
  return [...map.values()];
}

function summarize(records: TerritoryWorkflowRecord[]): TerritoryWorkflowSummary {
  const now = Date.now();
  return {
    total: records.length,
    emMutirao: records.filter((record) => record.workflowState === "em_mutirao").length,
    emAcompanhamento: records.filter((record) => record.workflowState === "em_acompanhamento").length,
    concluidoPorEnquanto: records.filter((record) => record.workflowState === "concluido_por_enquanto").length,
    prioritiesToday: records.filter((record) => queuePriorityScore(record, now) <= 1).length,
    acompanhamentoAtrasado: records.filter((record) => record.workflowState === "em_acompanhamento" && isTerritoryWorkflowOverdue(record, now)).length,
    concluidoRecentemente: records.filter((record) => record.workflowState === "concluido_por_enquanto" && isTerritoryWorkflowRecent(record, now)).length,
    stationEditorResponsible: records.filter((record) => record.responsibleRole === "station_editor").length,
    curadoriaResponsible: records.filter((record) => record.responsibleRole === "curadoria").length,
    operacaoAdminResponsible: records.filter((record) => record.responsibleRole === "operacao_admin").length,
    semResponsavel: records.filter((record) => !record.responsibleRole).length,
    dueToday: records.filter((record) => record.dueKind === "hoje").length,
    dueThisWeek: records.filter((record) => record.dueKind === "esta_semana").length,
    semPrazo: records.filter((record) => record.dueKind === "sem_prazo").length,
    bloqueado: records.filter((record) => hasTerritoryWorkflowBlock(record)).length,
    aguardandoSemeadura: records.filter((record) => record.blockKind === "aguardando_semeadura").length,
    aguardandoCuradoria: records.filter((record) => record.blockKind === "aguardando_curadoria").length,
    aguardandoEditor: records.filter((record) => record.blockKind === "aguardando_editor").length,
    semPrioridadeAgora: records.filter((record) => record.blockKind === "sem_prioridade_agora").length,
    latestFollowUpAt: records.find((record) => record.followUpAt)?.followUpAt ?? null,
    latestUpdatedAt: records[0]?.updatedAt ?? null
  };
}

export async function getTerritoryWorkflowReadout(limit = 200): Promise<TerritoryWorkflowReadout> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("territory_workflow_states")
      .select("territory_key,city,city_slug,neighborhood,workflow_state,responsible_role,responsible_name,due_kind,due_at,block_kind,note,follow_up_at,actor_id,actor_email,payload,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      if (error) {
        console.error("Failed to load territory workflow states", error);
      }
      return {
        summary: {
          total: 0,
          emMutirao: 0,
          emAcompanhamento: 0,
          concluidoPorEnquanto: 0,
          prioritiesToday: 0,
          acompanhamentoAtrasado: 0,
          concluidoRecentemente: 0,
          stationEditorResponsible: 0,
          curadoriaResponsible: 0,
          operacaoAdminResponsible: 0,
          semResponsavel: 0,
          dueToday: 0,
          dueThisWeek: 0,
          semPrazo: 0,
          bloqueado: 0,
          aguardandoSemeadura: 0,
          aguardandoCuradoria: 0,
          aguardandoEditor: 0,
          semPrioridadeAgora: 0,
          latestFollowUpAt: null,
          latestUpdatedAt: null
        },
        records: []
      };
    }

    const records = dedupeLatest((data as Array<{
      territory_key: string;
      city: string;
      city_slug: string;
      neighborhood: string;
      workflow_state: TerritoryWorkflowState;
      responsible_role: string | null;
      responsible_name: string | null;
      due_kind: string | null;
      due_at: string | null;
      block_kind: string | null;
      note: string | null;
      follow_up_at: string | null;
      actor_id: string | null;
      actor_email: string | null;
      payload: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>).map((row) => ({
      territoryKey: row.territory_key,
      city: row.city,
      citySlug: row.city_slug || getAuditCitySlug(row.city),
      neighborhood: row.neighborhood,
      workflowState: row.workflow_state,
      responsibleRole: normalizeRole(row.responsible_role),
      responsibleName: row.responsible_name?.trim() || null,
      dueKind: normalizeDueKind(row.due_kind),
      dueAt: row.due_at,
      blockKind: normalizeBlockKind(row.block_kind),
      note: row.note,
      followUpAt: row.follow_up_at,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      payload: row.payload ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));

    return {
      summary: summarize(records),
      records
    };
  } catch (error) {
    console.error("Failed to initialize territory workflow readout", error);
    return {
      summary: {
        total: 0,
        emMutirao: 0,
        emAcompanhamento: 0,
        concluidoPorEnquanto: 0,
        prioritiesToday: 0,
        acompanhamentoAtrasado: 0,
        concluidoRecentemente: 0,
        stationEditorResponsible: 0,
        curadoriaResponsible: 0,
        operacaoAdminResponsible: 0,
        semResponsavel: 0,
        dueToday: 0,
        dueThisWeek: 0,
        semPrazo: 0,
        bloqueado: 0,
        aguardandoSemeadura: 0,
        aguardandoCuradoria: 0,
        aguardandoEditor: 0,
        semPrioridadeAgora: 0,
        latestFollowUpAt: null,
        latestUpdatedAt: null
      },
      records: []
    };
  }
}

export async function getTerritoryWorkflowQueueReadout(limit = 200): Promise<TerritoryWorkflowQueueReadout> {
  const readout = await getTerritoryWorkflowReadout(limit);
  const sorted = [...readout.records].sort(queueCompare);
  const now = Date.now();

  return {
    summary: readout.summary,
    records: sorted,
    prioritiesToday: sorted.filter((record) => queuePriorityScore(record, now) <= 1),
    mutirao: sorted.filter((record) => record.workflowState === "em_mutirao"),
    acompanhamentoAtrasado: sorted.filter((record) => record.workflowState === "em_acompanhamento" && isTerritoryWorkflowOverdue(record, now)),
    concluidoRecentemente: sorted.filter((record) => record.workflowState === "concluido_por_enquanto" && isTerritoryWorkflowRecent(record, now)),
    bloqueiosCurtos: sorted.filter((record) => hasTerritoryWorkflowBlock(record))
  };
}

export function resolveTerritoryWorkflowState(records: TerritoryWorkflowRecord[], city?: string | null, neighborhood?: string | null) {
  const exactKey = territoryWorkflowKey(city ?? "", neighborhood ?? "");
  const cityKey = territoryWorkflowKey(city ?? "", "");
  return records.find((record) => record.territoryKey === exactKey) ?? records.find((record) => record.territoryKey === cityKey) ?? null;
}

export function buildTerritoryWorkflowReturnTo(
  path: string,
  city?: string | null,
  neighborhood?: string | null,
  territoryContext?: string | null,
  extraParams?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (territoryContext) params.set("territoryContext", territoryContext);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function listTerritoryWorkflowStates() {
  return [...TERRITORY_WORKFLOW_STATES];
}

export function listTerritoryWorkflowResponsibleRoles() {
  return [...TERRITORY_WORKFLOW_RESPONSIBLE_ROLES];
}

export function listTerritoryWorkflowDueKinds() {
  return [...TERRITORY_WORKFLOW_DUE_KINDS];
}

export function listTerritoryWorkflowBlockKinds() {
  return [...TERRITORY_WORKFLOW_BLOCK_KINDS];
}

export function territoryWorkflowDueAtForKind(kind: TerritoryWorkflowDueKind) {
  return dueAtFromKind(kind);
}

export function territoryWorkflowIsOverdue(record: TerritoryWorkflowRecord) {
  return isTerritoryWorkflowOverdue(record);
}

export function territoryWorkflowHasBlock(record: TerritoryWorkflowRecord) {
  return hasTerritoryWorkflowBlock(record);
}