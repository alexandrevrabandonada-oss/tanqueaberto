import Link from "next/link";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getStationEditorRoster, type StationEditorSummary } from "@/lib/ops/station-editors";
import { getTerritorialCoverageReadout, type TerritorialCoverageZoneRow } from "@/lib/ops/territorial-coverage";
import { getTerritorialCoverageHistoryReadout, type TerritorialCoverageHistoryZoneRow } from "@/lib/ops/territorial-coverage-snapshots";
import { getTerritorialSeedingImpactReadout, type SeedingImpactZoneRow } from "@/lib/ops/territorial-seeding-impact";
import { getTerritoryWorkflowQueueReadout, type TerritoryWorkflowRecord } from "@/lib/ops/territory-workflow";
import { buildWeeklyPostsCopyText, buildWeeklyPostsSummary } from "@/lib/ops/weekly-posts";
import { WeeklyPostsPautaActions } from "@/components/admin/ops/weekly-posts-pauta-actions";

export const dynamic = "force-dynamic";

type TerritoryKey = string;

type WeeklyTerritoryCard = {
  city: string;
  neighborhood: string;
  coverageState: TerritorialCoverageZoneRow["coverageState"];
  coverageRatio: number;
  signals: string[];
  reason: string;
  sourceTags: string[];
  priority: number;
  links: {
    semeadura: Route;
    cobertura: Route;
    curadoria: Route;
    editores: Route;
  };
};

function territoryKey(city: string, neighborhood: string) {
  return `${city}::${neighborhood}`;
}

function territoryHref(path: string, city: string, neighborhood?: string, context = "resumo_semanal") {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", context);
  const suffix = params.toString();
  return suffix ? (`${path}?${suffix}` as Route) : (path as Route);
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

function coverageBadge(state: TerritorialCoverageZoneRow["coverageState"]) {
  if (state === "boa") return "accent";
  if (state === "fraca") return "warning";
  return "danger";
}

function sourceChips(tags: string[]) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 4).map((tag) => (
        <Badge key={tag} variant="outline" className="h-6 px-2 text-[9px] uppercase tracking-[0.14em]">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function TerritoryCard({ item }: { item: WeeklyTerritoryCard }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-white">{item.city}</p>
            <Badge variant={coverageBadge(item.coverageState) as any}>{item.coverageState}</Badge>
            <Badge variant="outline">{pct(item.coverageRatio)}</Badge>
          </div>
          <p className="text-sm text-white/54">{item.neighborhood}</p>
          <p className="text-[11px] text-white/42">{item.reason}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Cobertura</p>
          <p className="text-2xl font-semibold text-white">{pct(item.coverageRatio)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">{sourceChips(item.sourceTags)}</div>
      {item.signals.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{item.signals.slice(0, 4).map((signal) => <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">{signal}</Badge>)}</div> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={item.links.semeadura} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">
          Abrir semeadura neste bairro
        </Link>
        <Link href={item.links.cobertura} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
          Ver cobertura
        </Link>
        <Link href={item.links.curadoria} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
          Abrir curadoria
        </Link>
        <Link href={item.links.editores} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
          Ver editores
        </Link>
      </div>
    </div>
  );
}

function buildHotTerritories(
  coverageTop: TerritorialCoverageZoneRow[],
  impactHot: SeedingImpactZoneRow[],
  workflowHot: TerritoryWorkflowRecord[],
  historyImproved: TerritorialCoverageHistoryZoneRow[]
) {
  const items = new Map<TerritoryKey, WeeklyTerritoryCard>();

  for (const zone of coverageTop.slice(0, 8)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    items.set(key, {
      city: zone.city,
      neighborhood: zone.neighborhood,
      coverageState: zone.coverageState,
      coverageRatio: zone.coverageRatio,
      signals: zone.signals,
      reason: zone.coverageState === "boa" ? "Cobertura forte e viva." : zone.coverageState === "fraca" ? "Cobertura útil, mas ainda rala." : "Cobertura ainda precisa de base.",
      sourceTags: ["cobertura"],
      priority: zone.priority,
      links: {
        semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood),
        cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood),
        curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood),
        editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood)
      }
    });
  }

  for (const zone of impactHot.slice(0, 8)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    const existing = items.get(key);
    const tags = new Set(existing?.sourceTags ?? []);
    tags.add("impacto");
    items.set(key, {
      city: zone.city,
      neighborhood: zone.neighborhood,
      coverageState: zone.coverageState,
      coverageRatio: zone.coverageRatio,
      signals: zone.signals,
      reason: zone.transition === "fraca_para_boa" ? "A semeadura já melhorou a base." : zone.transition === "vazia_para_fraca" ? "Território começou a ganhar cobertura." : "Território com movimento útil na semana.",
      sourceTags: [...tags],
      priority: existing ? Math.max(existing.priority, zone.priority) : zone.priority,
      links: {
        semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood),
        cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood),
        curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood),
        editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood)
      }
    });
  }

  for (const record of workflowHot.slice(0, 8)) {
    const key = territoryKey(record.city, record.neighborhood);
    const existing = items.get(key);
    const tags = new Set(existing?.sourceTags ?? []);
    tags.add("fila");
    items.set(key, {
      city: record.city,
      neighborhood: record.neighborhood,
      coverageState: existing?.coverageState ?? "fraca",
      coverageRatio: existing?.coverageRatio ?? 0,
      signals: existing?.signals ?? [],
      reason: record.workflowState === "em_acompanhamento" ? "Fila do dia pede reação." : record.workflowState === "em_mutirao" ? "Território em mutirão agora." : "Território com prioridade operacional.",
      sourceTags: [...tags],
      priority: existing ? Math.max(existing.priority, 100) : 100,
      links: existing?.links ?? {
        semeadura: territoryHref("/postos/cadastrar", record.city, record.neighborhood),
        cobertura: territoryHref("/admin/ops/cobertura-territorial", record.city, record.neighborhood),
        curadoria: territoryHref("/admin/ops/qualidade", record.city, record.neighborhood),
        editores: territoryHref("/admin/ops/station-editors", record.city, record.neighborhood)
      }
    });
  }

  for (const zone of historyImproved.slice(0, 8)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    const existing = items.get(key);
    const tags = new Set(existing?.sourceTags ?? []);
    tags.add("histórico");
    items.set(key, {
      city: zone.city,
      neighborhood: zone.neighborhood,
      coverageState: zone.coverageState,
      coverageRatio: zone.coverageRatio,
      signals: zone.signals,
      reason: "Subiu no histórico recente e merece repetição do padrão.",
      sourceTags: [...tags],
      priority: existing ? Math.max(existing.priority, zone.priority) : zone.priority,
      links: existing?.links ?? {
        semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood),
        cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood),
        curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood),
        editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood)
      }
    });
  }

  return [...items.values()].sort((left, right) => right.priority - left.priority).slice(0, 6);
}

function buildStalledTerritories(historyStalled: TerritorialCoverageHistoryZoneRow[], coverageEmpty: TerritorialCoverageZoneRow[]) {
  const items = new Map<TerritoryKey, WeeklyTerritoryCard>();

  for (const zone of historyStalled.slice(0, 6)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    items.set(key, {
      city: zone.city,
      neighborhood: zone.neighborhood,
      coverageState: zone.coverageState,
      coverageRatio: zone.coverageRatio,
      signals: zone.signals,
      reason: "Ficou estável demais e precisa de novo empurrão.",
      sourceTags: ["histórico"],
      priority: zone.priority,
      links: {
        semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood),
        cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood),
        curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood),
        editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood)
      }
    });
  }

  for (const zone of coverageEmpty.slice(0, 6)) {
    const key = territoryKey(zone.city, zone.neighborhood);
    const existing = items.get(key);
    items.set(key, existing ?? {
      city: zone.city,
      neighborhood: zone.neighborhood,
      coverageState: zone.coverageState,
      coverageRatio: zone.coverageRatio,
      signals: zone.signals,
      reason: "Ainda depende de semeadura ou confirmação de base.",
      sourceTags: ["cobertura"],
      priority: zone.priority,
      links: {
        semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood),
        cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood),
        curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood),
        editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood)
      }
    });
  }

  return [...items.values()].sort((left, right) => right.priority - left.priority).slice(0, 6);
}

function buildPriorityWithoutUpdate(coverageZones: TerritorialCoverageZoneRow[]) {
  return coverageZones
    .filter((zone) => zone.stationsWithoutUpdate > 0)
    .sort((left, right) => right.stationsWithoutUpdate - left.stationsWithoutUpdate || right.priority - left.priority)
    .slice(0, 6);
}

function EditorCard({ editor }: { editor: StationEditorSummary }) {
  const balance = editorBalance(editor);
  const load = editorLoad(editor);
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-white">{editor.email}</p>
          <p className="text-[11px] text-white/42">Última atuação {editor.lastSeedAt ? new Date(editor.lastSeedAt).toLocaleDateString("pt-BR") : "-"}</p>
        </div>
        <Badge variant={balance >= 0 ? "accent" : "warning" as any}>{balance >= 0 ? "saldo bom" : "saldo baixo"}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Semeadas</p><p className="mt-1 text-lg font-semibold text-white">{editor.createdCount}</p></div>
        <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Ativas</p><p className="mt-1 text-lg font-semibold text-white">{editor.activeCount}</p></div>
        <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Revisão</p><p className="mt-1 text-lg font-semibold text-white">{editor.reviewCount}</p></div>
        <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Dup.</p><p className="mt-1 text-lg font-semibold text-white">{editor.duplicateCount}</p></div>
      </div>
      <p className="mt-3 text-[11px] text-white/44">Saldo: {balance} · {load} ações no período</p>
    </div>
  );
}

export default async function WeeklyPostsSummaryPage() {
  await requireAdminUser();
  const [coverage, history, impact, workflow, editors] = await Promise.all([
    getTerritorialCoverageReadout(30),
    getTerritorialCoverageHistoryReadout(90),
    getTerritorialSeedingImpactReadout(30),
    getTerritoryWorkflowQueueReadout(200),
    getStationEditorRoster()
  ]);

  const hotTerritories = buildHotTerritories(coverage.topZones, impact.liftedWeakToGood, workflow.prioritiesToday, history.improvedNeighborhoods);
  const stalledTerritories = buildStalledTerritories(history.stalledNeighborhoods, coverage.neighborhoods.filter((zone) => zone.coverageState === "vazia"));
  const priorityWithoutUpdate = buildPriorityWithoutUpdate(coverage.neighborhoods);
  const bestEditors = [...editors.editors].sort((left, right) => editorBalance(right) - editorBalance(left) || editorLoad(right) - editorLoad(left)).slice(0, 6);
  const weeklyPauta = buildWeeklyPostsSummary({ coverage, history, impact, workflow, editors });
  const weeklyPautaText = buildWeeklyPostsCopyText(weeklyPauta);
  const weeklyPautaCsvHref = "/admin/ops/export?kind=weekly-posts" as Route;
  const focus = hotTerritories[0] ?? stalledTerritories[0] ?? priorityWithoutUpdate[0] ?? null;

  return (
    <div className="space-y-6 pb-20">
      <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Resumo semanal</p>
            <h1 className="text-2xl font-semibold text-white">Frente de postos da semana</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/58">Leitura curta para coordenação: onde a base esquentou, onde travou e quem segurou a operação.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ops" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Voltar ao OPS</Link>
            <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Cobertura</Link>
            <Link href="/admin/ops/impacto-semeadura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Impacto</Link>
            <Link href="/admin/ops/historico-cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Histórico</Link>
            <Link href="/admin/ops/fila-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Fila do dia</Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Territórios quentes", value: hotTerritories.length, note: "mistura cobertura, impacto e fila" },
            { label: "Territórios parados", value: stalledTerritories.length, note: "precisam de novo empurrão" },
            { label: "Bairros melhoraram", value: history.improvedNeighborhoods.length, note: "subiram no histórico" },
            { label: "Bairros vazios", value: coverage.summary.emptyZones, note: "seguem sem base útil" },
            { label: "Sem atualização prioritários", value: priorityWithoutUpdate.length, note: "pontos para reanimar" },
            { label: "Editors bons", value: bestEditors.length, note: "melhor saldo da semana" }
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] text-white/42">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard id="pauta" className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Pauta exportável</p>
            <h2 className="text-lg font-semibold text-white">Copiar para WhatsApp ou mutirão</h2>
            <p className="text-sm text-white/58">Versão curta para coordenação fora do sistema. Cabe em grupo e já abre a próxima ação.</p>
          </div>
          <Badge variant="outline">{weeklyPauta.hotTerritories.length} quentes · {weeklyPauta.priorityWithoutUpdate.length} sem atualização</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/62">
            <p className="font-semibold text-white">Bairros quentes</p>
            <p className="mt-1">{weeklyPauta.hotTerritories.slice(0, 3).map((item) => item.city).join(', ') || 'Nenhum no recorte.'}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/62">
            <p className="font-semibold text-white">Bairros parados</p>
            <p className="mt-1">{weeklyPauta.stalledTerritories.slice(0, 3).map((item) => item.city).join(', ') || 'Nenhum no recorte.'}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/62">
            <p className="font-semibold text-white">Bairros vazios</p>
            <p className="mt-1">{weeklyPauta.emptyNeighborhoods.slice(0, 3).map((item) => item.city).join(', ') || 'Nenhum no recorte.'}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/62">
            <p className="font-semibold text-white">Editors com saldo</p>
            <p className="mt-1">{weeklyPauta.bestEditors.slice(0, 3).map((item) => item.email).join(', ') || 'Ninguém no recorte.'}</p>
          </div>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Resumo curto</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-relaxed text-white/72">{weeklyPautaText}</pre>
        </div>
        <WeeklyPostsPautaActions copyText={weeklyPautaText} csvHref={weeklyPautaCsvHref} />
      </SectionCard>

      {focus ? (
        <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Próxima ação</p>
              <h2 className="text-lg font-semibold text-white">{focus.city} · {focus.neighborhood}</h2>
              <p className="text-sm text-white/58">{focus.reason}</p>
            </div>
            <Badge variant="outline">{focus.coverageState}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={focus.links.semeadura} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">Abrir semeadura</Link>
            <Link href={focus.links.cobertura} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Abrir cobertura</Link>
            <Link href={focus.links.curadoria} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Abrir curadoria</Link>
            <Link href={focus.links.editores} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver editores</Link>
          </div>
          <div className="flex flex-wrap gap-2">{focus.signals.slice(0, 4).map((signal) => <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">{signal}</Badge>)}</div>
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Territórios quentes da semana</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Onde a coordenação deve começar</h2>
            <p className="mt-1 text-sm text-white/54">Prioridade combinando cobertura atual, impacto da semeadura e fila territorial.</p>
          </div>
          <Badge variant="outline">{hotTerritories.length}</Badge>
        </div>
        <div className="space-y-3">{hotTerritories.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum território quente identificado no recorte.</div> : hotTerritories.map((item) => <TerritoryCard key={`${item.city}-${item.neighborhood}`} item={item} />)}</div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Territórios parados</p>
              <h2 className="mt-1 text-xl font-semibold text-white">O que travou e não avançou</h2>
            </div>
            <Badge variant="outline">{stalledTerritories.length}</Badge>
          </div>
          <div className="space-y-3">{stalledTerritories.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Sem território parado no recorte.</div> : stalledTerritories.map((item) => <TerritoryCard key={`${item.city}-${item.neighborhood}`} item={item} />)}</div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Bairros que melhoraram</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Subiram no histórico persistido</h2>
            </div>
            <Badge variant="outline">{history.improvedNeighborhoods.length}</Badge>
          </div>
          <div className="space-y-3">{history.improvedNeighborhoods.slice(0, 6).map((zone) => <TerritoryCard key={`${zone.city}-${zone.neighborhood}`} item={{ city: zone.city, neighborhood: zone.neighborhood, coverageState: zone.coverageState, coverageRatio: zone.coverageRatio, signals: zone.signals, reason: "Historicamente melhorou e vale replicar o padrão.", sourceTags: ["histórico", "impacto"], priority: zone.priority, links: { semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood), cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood), curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood), editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood) } }} />)}</div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Bairros vazios</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde ainda falta base</h2>
            </div>
            <Badge variant="outline">{coverage.summary.emptyZones}</Badge>
          </div>
          <div className="space-y-3">{coverage.neighborhoods.filter((zone) => zone.coverageState === "vazia").slice(0, 6).map((zone) => <TerritoryCard key={`${zone.city}-${zone.neighborhood}`} item={{ city: zone.city, neighborhood: zone.neighborhood, coverageState: zone.coverageState, coverageRatio: zone.coverageRatio, signals: zone.signals, reason: "Ainda depende de semeadura para sair da vacância.", sourceTags: ["cobertura"], priority: zone.priority, links: { semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood), cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood), curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood), editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood) } }} />)}</div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sem atualização prioritários</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde o preço esfriou</h2>
            </div>
            <Badge variant="outline">{priorityWithoutUpdate.length}</Badge>
          </div>
          <div className="space-y-3">{priorityWithoutUpdate.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Sem postos prioritários sem atualização no recorte.</div> : priorityWithoutUpdate.map((zone) => <TerritoryCard key={`${zone.city}-${zone.neighborhood}`} item={{ city: zone.city, neighborhood: zone.neighborhood, coverageState: zone.coverageState, coverageRatio: zone.coverageRatio, signals: zone.signals, reason: `${zone.stationsWithoutUpdate} postos sem atualização recente.`, sourceTags: ["cobertura", "sem atualização"], priority: zone.priority, links: { semeadura: territoryHref("/postos/cadastrar", zone.city, zone.neighborhood), cobertura: territoryHref("/admin/ops/cobertura-territorial", zone.city, zone.neighborhood), curadoria: territoryHref("/admin/ops/qualidade", zone.city, zone.neighborhood), editores: territoryHref("/admin/ops/station-editors", zone.city, zone.neighborhood) } }} />)}</div>
        </SectionCard>
      </div>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Station editors</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Melhor saldo operacional da semana</h2>
            <p className="mt-1 text-sm text-white/54">Saldo simples para ajudar na coordenação: mais ativo e menos duplicado ou revisão.</p>
          </div>
          <Badge variant="outline">{bestEditors.length}</Badge>
        </div>
        <div className="space-y-3">
          {bestEditors.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum editor semeou no recorte.</div> : bestEditors.map((editor) => {
            const balance = editorBalance(editor);
            return (
              <div key={editor.email} className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-white">{editor.email}</p>
                    <p className="text-[11px] text-white/42">Última atuação {editor.lastSeedAt ? new Date(editor.lastSeedAt).toLocaleDateString("pt-BR") : "-"}</p>
                  </div>
                  <Badge variant={balance >= 0 ? "accent" : "warning" as any}>{balance >= 0 ? "saldo bom" : "saldo baixo"}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Semeadas</p><p className="mt-1 text-lg font-semibold text-white">{editor.createdCount}</p></div>
                  <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Ativas</p><p className="mt-1 text-lg font-semibold text-white">{editor.activeCount}</p></div>
                  <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Revisão</p><p className="mt-1 text-lg font-semibold text-white">{editor.reviewCount}</p></div>
                  <div className="rounded-[16px] border border-white/8 bg-white/5 p-2"><p className="text-white/38">Dup.</p><p className="mt-1 text-lg font-semibold text-white">{editor.duplicateCount}</p></div>
                </div>
                <p className="mt-3 text-[11px] text-white/44">Saldo: {balance} · {editorLoad(editor)} ações no período</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Leitura curta</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Como usar o resumo semanal</h2>
          </div>
          <Badge variant="outline">operacional</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60"><p className="font-semibold text-white">Quente</p><p className="mt-1">Abra onde a cobertura, o impacto e a fila convergem para o mesmo território.</p></div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60"><p className="font-semibold text-white">Parado</p><p className="mt-1">Volte em bairros que não saíram do lugar e precise de nova semeadura.</p></div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60"><p className="font-semibold text-white">Editor</p><p className="mt-1">Use o saldo operacional para escolher quem pode puxar o próximo mutirão.</p></div>
        </div>
      </SectionCard>
    </div>
  );
}