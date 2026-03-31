import { ShieldAlert, Image as ImageIcon, AlertCircle, TrendingDown, ArrowUpRight } from "lucide-react";
export const dynamic = 'force-dynamic';
import { getQualityMetrics } from "@/lib/data/quality-queries";
import { getActiveStations, getStationReviewQueue } from "@/lib/data/queries";
import { getTerritorialCurationQueue, summarizeTerritorialCurationByCity } from "@/lib/ops/territorial-curation";
import { getLaunchObservabilityReport, getSubmissionBorderThresholds } from "@/lib/ops/launch-observability";
import { TerritorialCurationPanel } from "@/components/admin/ops/territorial-curation-panel";
import { TerritoryWorkflowControls } from "@/components/admin/ops/territory-workflow-controls";
import { getTerritoryWorkflowReadout, resolveTerritoryWorkflowState } from "@/lib/ops/territory-workflow";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";
import Link from "next/link";
import type { Route } from "next";

interface QualityDashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readTerritory(searchParams: Record<string, string | string[] | undefined>) {
  const city = typeof searchParams.city === "string" ? searchParams.city.trim() : "";
  const neighborhood = typeof searchParams.neighborhood === "string" ? searchParams.neighborhood.trim() : "";
  const territoryContext = typeof searchParams.territoryContext === "string" ? searchParams.territoryContext : "";
  return { city, neighborhood, territoryContext };
}

function territoryHref(path: string, city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "coverage");
  const suffix = params.toString();
  return suffix ? (`${path}?${suffix}` as Route) : (path as Route);
}

function matchesTerritory(station: { city?: string | null; neighborhood?: string | null }, territory: { city: string; neighborhood: string }) {
  if (territory.city && normalize(station.city) !== normalize(territory.city)) return false;
  if (territory.neighborhood && normalize(station.neighborhood) !== normalize(territory.neighborhood)) return false;
  return true;
}

export default async function QualityDashboardPage({ searchParams }: QualityDashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const territory = readTerritory(resolvedSearchParams);
  const [metrics, reviewStations, catalogStations] = await Promise.all([
    getQualityMetrics(7),
    getStationReviewQueue(60),
    getActiveStations()
  ]);
  const launchReport = await getLaunchObservabilityReport(7);
  const workflowReadout = await getTerritoryWorkflowReadout(120);
  const currentWorkflow = territory.city || territory.neighborhood ? resolveTerritoryWorkflowState(workflowReadout.records, territory.city || undefined, territory.neighborhood || undefined) : null;
  const territorialQueueAll = getTerritorialCurationQueue(reviewStations, 60, catalogStations);
  const territorialQueue = territory.city || territory.neighborhood
    ? territorialQueueAll.filter((item) => matchesTerritory(item.station, territory))
    : territorialQueueAll;
  const citySummaries = summarizeTerritorialCurationByCity(territorialQueue);
  const fastApproveCount = territorialQueue.filter((item) => item.proposalReviewState === "boa_rapida" && item.duplicateCandidates.length === 0).length;
  const duplicateRiskCount = territorialQueue.filter((item) => item.duplicateCandidates.length > 0).length;
  const needsReviewCount = territorialQueue.filter((item) => item.proposalReviewState === "precisa_revisar").length;
  const vagueCount = territorialQueue.filter((item) => item.proposalReviewState === "muito_vaga").length;
  const noGeoCount = territorialQueue.filter((item) => item.needsCoordinate).length;
  const quickDecisionCount = fastApproveCount + duplicateRiskCount;
  const borderSummary = launchReport.submissionBorders;
  const borderThresholds = getSubmissionBorderThresholds(borderSummary);

  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Qualidade do Dado</h1>
        <p className="text-sm text-white/54">Monitoramento de ruído, conflitos e integridade das submissões (7 dias).</p>
      </div>

      {territory.city || territory.neighborhood ? (
        <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Território em foco</p>
              <h2 className="text-lg font-semibold text-white">{territory.neighborhood || territory.city}</h2>
              <p className="text-sm text-white/58">Curadoria restrita para este território. Use a fila já filtrada para abrir a próxima ação.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={territoryHref("/postos/cadastrar", territory.city || undefined, territory.neighborhood || undefined)} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">
                Abrir semeadura neste bairro
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link href={territoryHref("/postos/sem-atualizacao", territory.city || undefined, territory.neighborhood || undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
                Ver postos sem atualização
              </Link>
              <Link href={territoryHref("/admin/ops/station-editors", territory.city || undefined, territory.neighborhood || undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
                Ver editores que atuaram aqui
              </Link>
            </div>
          </div>
          <TerritoryWorkflowControls
            city={territory.city || territory.neighborhood || ""}
            neighborhood={territory.neighborhood || null}
            returnTo="/admin/ops/qualidade"
            currentState={currentWorkflow}
            compact
          />
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4 bg-white/5 border-white/8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30">Resumo operacional</p>
            <h2 className="text-lg font-semibold text-white">O que revisar primeiro</h2>
            <p className="mt-1 text-sm text-white/54">Decisão rápida por risco, geo e duplicidade antes de abrir a fila inteira.</p>
          </div>
          <Badge variant="outline">{territorialQueue.length} na fila</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
          <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-emerald-200/72">Aprovar rápido</p>
            <p className="mt-1 text-2xl font-bold text-white">{fastApproveCount}</p>
            <p className="mt-2 text-[10px] text-emerald-100/60">{quickDecisionCount} com decisão clara</p>
          </div>

          <div className="rounded-[18px] border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-red-100/72">Duplicidade</p>
            <p className="mt-1 text-2xl font-bold text-white">{duplicateRiskCount}</p>
            <p className="mt-2 text-[10px] text-red-100/60">Vincule antes de aprovar</p>
          </div>

          <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-amber-100/72">Sem geo</p>
            <p className="mt-1 text-2xl font-bold text-white">{noGeoCount}</p>
            <p className="mt-2 text-[10px] text-amber-50/60">Precisa sinal mínimo</p>
          </div>

          <div className="rounded-[18px] border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-100/72">Muito vaga</p>
            <p className="mt-1 text-2xl font-bold text-white">{vagueCount}</p>
            <p className="mt-2 text-[10px] text-fuchsia-50/60">Pedir mais dado</p>
          </div>

          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Precisa revisar</p>
            <p className="mt-1 text-2xl font-bold text-white">{needsReviewCount}</p>
            <p className="mt-2 text-[10px] text-white/40">Fila restante</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Ruído Global</p>
          <p className="mt-1 text-2xl font-bold text-white">{(metrics.noiseRatio * 100).toFixed(1)}%</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
            <TrendingDown className="h-3 w-3" />
            <span>Sinalizações/Total</span>
          </div>
        </SectionCard>

        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Conflitos de Preço</p>
          <p className="mt-1 text-2xl font-bold text-orange-400">{metrics.priceConflicts}</p>
          <p className="mt-2 text-[10px] text-white/40">Discrepância {">"} 20%</p>
        </SectionCard>

        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Reuso de Foto</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{metrics.potentialPhotoReuses}</p>
          <p className="mt-2 text-[10px] text-white/40">Hash duplicado (48h)</p>
        </SectionCard>

        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Total Sinalizados</p>
          <p className="mt-1 text-2xl font-bold text-white">{metrics.flaggedReports}</p>
          <p className="mt-2 text-[10px] text-white/40">Aguardando revisão foca</p>
        </SectionCard>
      </div>

      <SectionCard className="space-y-4 bg-white/5 border-white/8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30">Bordas do envio</p>
            <h2 className="text-lg font-semibold text-white">Sugestão, geo e posto novo</h2>
            <p className="mt-1 text-sm text-white/54">Leitura rápida de quando o envio está saudável, em atenção ou com problema.</p>
          </div>
          <Badge variant="outline">7 dias</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            { key: "suggestionAcceptance", label: "Taxa de aceitação", value: `${borderSummary.suggestionAcceptanceRate.toFixed(1)}%`, counter: `${borderSummary.suggestionsAccepted}/${borderSummary.suggestionsShown} sugestões`, status: borderThresholds.suggestionAcceptance },
            { key: "suggestionChange", label: "Taxa de troca", value: `${borderSummary.suggestionChangeRate.toFixed(1)}%`, counter: `${borderSummary.suggestionsChanged} trocas`, status: borderThresholds.suggestionChange },
            { key: "stationAbandonment", label: "Abandono no posto", value: `${borderSummary.stationStepAbandoned}`, counter: "passo do posto", status: borderThresholds.stationAbandonment },
            { key: "lastUsedReuse", label: "Reuso do último posto", value: `${borderSummary.lastUsedReused}`, counter: "reuso local", status: borderThresholds.lastUsedReuse },
            { key: "proposalWithoutGeo", label: "Posto novo sem geo", value: `${borderSummary.proposalSubmittedWithoutGeo}`, counter: `${borderSummary.proposalCreated} propostas`, status: borderThresholds.proposalWithoutGeo }
          ].map((item) => (
            <div key={item.key} className="rounded-[20px] border border-white/8 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                </div>
                <Badge variant={item.status.state === "saudavel" ? "accent" : item.status.state === "atencao" ? "warning" : "danger"}>{item.status.label}</Badge>
              </div>
              <p className="mt-2 text-[11px] text-white/42">{item.counter}</p>
              <p className="mt-2 text-sm text-white/62">{item.status.summary}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Sugestões</p>
            <p className="mt-1 text-xl font-bold text-white">{borderSummary.suggestionsShown}</p>
            <p className="mt-1 text-[10px] text-white/42">{borderSummary.suggestionsAccepted} aceitas</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Trocas</p>
            <p className="mt-1 text-xl font-bold text-white">{borderSummary.suggestionsChanged}</p>
            <p className="mt-1 text-[10px] text-white/42">{borderSummary.suggestionChangeRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Último posto</p>
            <p className="mt-1 text-xl font-bold text-white">{borderSummary.lastUsedReused}</p>
            <p className="mt-1 text-[10px] text-white/42">Reuso local</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Geo</p>
            <p className="mt-1 text-xl font-bold text-white">{borderSummary.geoReliable}</p>
            <p className="mt-1 text-[10px] text-white/42">{borderSummary.geoImprecise} imprecisos</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Propostas</p>
            <p className="mt-1 text-xl font-bold text-white">{borderSummary.proposalCreated}</p>
            <p className="mt-1 text-[10px] text-white/42">{borderSummary.proposalGeoRate.toFixed(1)}% com geo</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Abandono posto</p>
            <p className="mt-1 text-xl font-bold text-white">{borderSummary.stationStepAbandoned}</p>
            <p className="mt-1 text-[10px] text-white/42">Passo do posto</p>
          </div>
        </div>
      </SectionCard>

      <TerritorialCurationPanel items={territorialQueue} citySummaries={citySummaries} />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Top Postos com Conflito</h2>
          </div>
          <div className="space-y-2">
            {metrics.topConflictStations.length === 0 ? (
              <p className="text-sm text-white/40 italic py-4">Nenhum conflito crítico recente.</p>
            ) : (
              metrics.topConflictStations.map(({ station, conflictCount }) => (
                <Link
                  key={station.id}
                  href={territoryHref("/admin/ops/qualidade", station.city, station.neighborhood)}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5 hover:bg-white/10 transition"
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-white">{station.name}</p>
                    <p className="truncate text-[10px] text-white/30">{station.neighborhood} · {station.city}</p>
                  </div>
                  <Badge variant="warning">{conflictCount} conflitos</Badge>
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Sinalizações Recentes</h2>
          </div>
          <div className="space-y-2">
            {metrics.recentFlaggedReports.length === 0 ? (
              <p className="text-sm text-white/40 italic py-4">Nenhuma sinalização automática pendente.</p>
            ) : (
              metrics.recentFlaggedReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin?search=${report.id}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5 hover:bg-white/10 transition"
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-white">{report.station.name}</p>
                    <p className="truncate text-[10px] text-white/30">{fuelLabels[report.fuelType]} · {formatCurrencyBRL(report.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {report.metadata?.potential_photo_reuse && <Badge variant="danger" className="text-[8px]">REUSO FOTO</Badge>}
                    {report.metadata?.price_discrepancy && <Badge variant="warning" className="text-[8px]">DIFERENÇA ALTA</Badge>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="p-6 bg-red-500/5 border-red-500/20">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
          <div className="space-y-2">
            <h3 className="font-semibold text-white text-lg">Integridade Operacional</h3>
            <p className="text-sm text-white/66 leading-relaxed">
              O sistema sinaliza automaticamente reports com discrepância de preço significativa ou fotos repetidas.
              <strong> Estes itens não aparecem na Fast Lane de moderação pública</strong> até serem revisados manualmente para evitar poluição da base.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}


