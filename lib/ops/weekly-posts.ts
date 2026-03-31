import { getAuditCitySlug } from "@/lib/audit/cities";
import type { TerritorialCoverageHistoryReadout, TerritorialCoverageHistoryZoneRow } from "@/lib/ops/territorial-coverage-snapshots";
import type { TerritorialCoverageReadout, TerritorialCoverageZoneRow } from "@/lib/ops/territorial-coverage";
import type { SeedingImpactReadout, SeedingImpactZoneRow } from "@/lib/ops/territorial-seeding-impact";
import type { StationEditorRoster, StationEditorSummary } from "@/lib/ops/station-editors";
import type { TerritoryWorkflowQueueReadout, TerritoryWorkflowRecord } from "@/lib/ops/territory-workflow";

export interface WeeklyPostsTerritoryItem {
  city: string;
  neighborhood: string;
  citySlug: string;
  coverageState: TerritorialCoverageZoneRow["coverageState"];
  coverageRatio: number;
  signals: string[];
  reason: string;
  sourceTags: string[];
  priority: number;
}

export interface WeeklyPostsEditorItem {
  email: string;
  createdCount: number;
  activeCount: number;
  reviewCount: number;
  duplicateCount: number;
  lastSeedAt: string | null;
  balance: number;
  load: number;
}

export interface WeeklyPostsSummary {
  hotTerritories: WeeklyPostsTerritoryItem[];
  stalledTerritories: WeeklyPostsTerritoryItem[];
  improvedNeighborhoods: WeeklyPostsTerritoryItem[];
  emptyNeighborhoods: WeeklyPostsTerritoryItem[];
  priorityWithoutUpdate: WeeklyPostsTerritoryItem[];
  bestEditors: WeeklyPostsEditorItem[];
  focus: WeeklyPostsTerritoryItem | null;
}

type TerritoryKey = string;

function territoryKey(city: string, neighborhood: string) {
  return `${city}::${neighborhood}`;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function editorBalance(editor: StationEditorSummary) {
  return editor.activeCount * 3 - editor.reviewCount * 2 - editor.duplicateCount * 4;
}

function editorLoad(editor: StationEditorSummary) {
  return editor.activeCount + editor.reviewCount + editor.duplicateCount;
}

function toItem(
  row: Pick<TerritorialCoverageZoneRow, "city" | "neighborhood" | "coverageState" | "coverageRatio" | "signals" | "priority">,
  reason: string,
  sourceTags: string[]
): WeeklyPostsTerritoryItem {
  return {
    city: row.city,
    neighborhood: row.neighborhood,
    citySlug: getAuditCitySlug(row.city),
    coverageState: row.coverageState,
    coverageRatio: row.coverageRatio,
    signals: row.signals,
    reason,
    sourceTags,
    priority: row.priority
  };
}

function mergeItems(existing: WeeklyPostsTerritoryItem | undefined, next: WeeklyPostsTerritoryItem) {
  if (!existing) return next;
  return {
    ...existing,
    signals: [...new Set([...(existing.signals ?? []), ...(next.signals ?? [])])].slice(0, 4),
    sourceTags: [...new Set([...(existing.sourceTags ?? []), ...(next.sourceTags ?? [])])].slice(0, 4),
    priority: Math.max(existing.priority, next.priority),
    reason: existing.reason || next.reason
  };
}

function buildHotTerritories(
  coverageTop: TerritorialCoverageZoneRow[],
  impactHot: SeedingImpactZoneRow[],
  workflowHot: TerritoryWorkflowRecord[],
  historyImproved: TerritorialCoverageHistoryZoneRow[]
) {
  const items = new Map<TerritoryKey, WeeklyPostsTerritoryItem>();

  for (const zone of coverageTop.slice(0, 8)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    items.set(key, toItem(zone, zone.coverageState === "boa" ? "Cobertura forte e viva." : zone.coverageState === "fraca" ? "Cobertura útil, mas ainda rala." : "Cobertura ainda precisa de base.", ["cobertura"]));
  }

  for (const zone of impactHot.slice(0, 8)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    const existing = items.get(key);
    items.set(
      key,
      mergeItems(
        existing,
        toItem(
          zone,
          zone.transition === "fraca_para_boa" ? "A semeadura já melhorou a base." : zone.transition === "vazia_para_fraca" ? "Território começou a ganhar cobertura." : "Território com movimento útil na semana.",
          ["impacto"]
        )
      )
    );
  }

  for (const record of workflowHot.slice(0, 8)) {
    const key = territoryKey(record.city, record.neighborhood);
    const existing = items.get(key);
    const next = toItem(
      existing ?? {
        city: record.city,
        neighborhood: record.neighborhood,
        coverageState: "fraca",
        coverageRatio: 0,
        signals: [],
        priority: 100
      },
      record.workflowState === "em_acompanhamento" ? "Fila do dia pede reação." : record.workflowState === "em_mutirao" ? "Território em mutirão agora." : "Território com prioridade operacional.",
      ["fila"]
    );
    items.set(key, mergeItems(existing, next));
  }

  for (const zone of historyImproved.slice(0, 8)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    const existing = items.get(key);
    items.set(key, mergeItems(existing, toItem(zone, "Subiu no histórico recente e merece repetição do padrão.", ["histórico"])));
  }

  return [...items.values()].sort((left, right) => right.priority - left.priority).slice(0, 6);
}

function buildStalledTerritories(historyStalled: TerritorialCoverageHistoryZoneRow[], coverageEmpty: TerritorialCoverageZoneRow[]) {
  const items = new Map<TerritoryKey, WeeklyPostsTerritoryItem>();

  for (const zone of historyStalled.slice(0, 6)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    items.set(key, toItem(zone, "Ficou estável demais e precisa de novo empurrão.", ["histórico"]));
  }

  for (const zone of coverageEmpty.slice(0, 6)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    const existing = items.get(key);
    items.set(key, existing ?? toItem(zone, "Ainda depende de semeadura ou confirmação de base.", ["cobertura"]));
  }

  return [...items.values()].sort((left, right) => right.priority - left.priority).slice(0, 6);
}

function buildPriorityWithoutUpdate(coverageZones: TerritorialCoverageZoneRow[]) {
  return coverageZones
    .filter((zone) => zone.stationsWithoutUpdate > 0)
    .sort((left, right) => right.stationsWithoutUpdate - left.stationsWithoutUpdate || right.priority - left.priority)
    .slice(0, 6)
    .map((zone) => toItem(zone, `${zone.stationsWithoutUpdate} postos sem atualização recente.`, ["cobertura", "sem atualização"]));
}

function buildEditors(editors: StationEditorRoster["editors"]) {
  return [...editors]
    .sort((left, right) => editorBalance(right) - editorBalance(left) || editorLoad(right) - editorLoad(left))
    .slice(0, 6)
    .map((editor) => ({
      email: editor.email,
      createdCount: editor.createdCount,
      activeCount: editor.activeCount,
      reviewCount: editor.reviewCount,
      duplicateCount: editor.duplicateCount,
      lastSeedAt: editor.lastSeedAt,
      balance: editorBalance(editor),
      load: editorLoad(editor)
    }));
}

function weeklyTerritoryLine(item: WeeklyPostsTerritoryItem) {
  return `- ${item.city} · ${item.neighborhood} — ${item.reason}`;
}

function editorLine(item: WeeklyPostsEditorItem) {
  return `- ${item.email} — saldo ${item.balance} · semeadas ${item.createdCount} · ativas ${item.activeCount} · revisão ${item.reviewCount} · duplicadas ${item.duplicateCount}`;
}

export function buildWeeklyPostsSummary(input: {
  coverage: TerritorialCoverageReadout;
  history: TerritorialCoverageHistoryReadout;
  impact: SeedingImpactReadout;
  workflow: TerritoryWorkflowQueueReadout;
  editors: StationEditorRoster;
}): WeeklyPostsSummary {
  const hotTerritories = buildHotTerritories(input.coverage.topZones, input.impact.liftedWeakToGood, input.workflow.prioritiesToday, input.history.improvedNeighborhoods);
  const stalledTerritories = buildStalledTerritories(input.history.stalledNeighborhoods, input.coverage.neighborhoods.filter((zone) => zone.coverageState === "vazia"));
  const improvedNeighborhoods = input.history.improvedNeighborhoods.slice(0, 6).map((zone) => toItem(zone, "Historicamente melhorou e vale replicar o padrão.", ["histórico", "impacto"]));
  const emptyNeighborhoods = input.coverage.neighborhoods
    .filter((zone) => zone.coverageState === "vazia")
    .slice(0, 6)
    .map((zone) => toItem(zone, "Ainda depende de semeadura para sair da vacância.", ["cobertura"]));
  const priorityWithoutUpdate = buildPriorityWithoutUpdate(input.coverage.neighborhoods);
  const bestEditors = buildEditors(input.editors.editors);
  const focus = hotTerritories[0] ?? stalledTerritories[0] ?? priorityWithoutUpdate[0] ?? null;

  return {
    hotTerritories,
    stalledTerritories,
    improvedNeighborhoods,
    emptyNeighborhoods,
    priorityWithoutUpdate,
    bestEditors,
    focus
  };
}

export function buildWeeklyPostsCopyText(summary: WeeklyPostsSummary) {
  const lines = [
    "PAUTA SEMANAL - POSTOS",
    "",
    `Quentes: ${summary.hotTerritories.length} | Parados: ${summary.stalledTerritories.length} | Vazios: ${summary.emptyNeighborhoods.length} | Sem atualização: ${summary.priorityWithoutUpdate.length}`,
    "",
    "1. Bairros quentes",
    ...(summary.hotTerritories.length > 0 ? summary.hotTerritories.slice(0, 3).map(weeklyTerritoryLine) : ["- Nenhum bairro quente no recorte."]),
    "",
    "2. Bairros parados",
    ...(summary.stalledTerritories.length > 0 ? summary.stalledTerritories.slice(0, 3).map(weeklyTerritoryLine) : ["- Nenhum bairro parado no recorte."]),
    "",
    "3. Bairros vazios",
    ...(summary.emptyNeighborhoods.length > 0 ? summary.emptyNeighborhoods.slice(0, 3).map(weeklyTerritoryLine) : ["- Nenhum bairro vazio no recorte."]),
    "",
    "4. Postos sem atualização prioritários",
    ...(summary.priorityWithoutUpdate.length > 0 ? summary.priorityWithoutUpdate.slice(0, 3).map(weeklyTerritoryLine) : ["- Nenhum posto prioritário sem atualização no recorte."]),
    "",
    "5. Station editors com melhor saldo",
    ...(summary.bestEditors.length > 0 ? summary.bestEditors.slice(0, 3).map(editorLine) : ["- Nenhum editor com saldo claro no recorte."])
  ];

  if (summary.focus) {
    lines.push("", `Próxima ação: abrir ${summary.focus.city} · ${summary.focus.neighborhood} agora.`);
  }

  return lines.join("\n");
}

export function buildWeeklyPostsCsvRows(summary: WeeklyPostsSummary) {
  return [
    ...summary.hotTerritories.map((item, index) => ({
      section: "quentes",
      rank: index + 1,
      city: item.city,
      neighborhood: item.neighborhood,
      coverage_state: item.coverageState,
      coverage_ratio: pct(item.coverageRatio),
      priority: item.priority,
      reason: item.reason,
      tags: item.sourceTags.join(" | "),
      signals: item.signals.join(" | ")
    })),
    ...summary.stalledTerritories.map((item, index) => ({
      section: "parados",
      rank: index + 1,
      city: item.city,
      neighborhood: item.neighborhood,
      coverage_state: item.coverageState,
      coverage_ratio: pct(item.coverageRatio),
      priority: item.priority,
      reason: item.reason,
      tags: item.sourceTags.join(" | "),
      signals: item.signals.join(" | ")
    })),
    ...summary.emptyNeighborhoods.map((item, index) => ({
      section: "vazios",
      rank: index + 1,
      city: item.city,
      neighborhood: item.neighborhood,
      coverage_state: item.coverageState,
      coverage_ratio: pct(item.coverageRatio),
      priority: item.priority,
      reason: item.reason,
      tags: item.sourceTags.join(" | "),
      signals: item.signals.join(" | ")
    })),
    ...summary.priorityWithoutUpdate.map((item, index) => ({
      section: "sem_atualizacao",
      rank: index + 1,
      city: item.city,
      neighborhood: item.neighborhood,
      coverage_state: item.coverageState,
      coverage_ratio: pct(item.coverageRatio),
      priority: item.priority,
      reason: item.reason,
      tags: item.sourceTags.join(" | "),
      signals: item.signals.join(" | ")
    })),
    ...summary.bestEditors.map((item, index) => ({
      section: "editores",
      rank: index + 1,
      email: item.email,
      balance: item.balance,
      created_count: item.createdCount,
      active_count: item.activeCount,
      review_count: item.reviewCount,
      duplicate_count: item.duplicateCount,
      last_seed_at: item.lastSeedAt ?? ""
    }))
  ];
}
