import Link from "next/link";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getTerritorialCoverageHistoryReadout, type TerritorialCoverageHistoryCityRow, type TerritorialCoverageHistoryZoneRow } from "@/lib/ops/territorial-coverage-snapshots";

export const dynamic = "force-dynamic";

type DaysKey = 30 | 90 | 180;

const DAYS_OPTIONS: DaysKey[] = [30, 90, 180];

function resolveDays(value: string | string[] | undefined): DaysKey {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return parsed === 90 || parsed === 180 ? parsed : 30;
}

function periodHref(days: DaysKey) {
  return `/admin/ops/historico-cobertura-territorial?days=${days}` as Route;
}

function territoryHref(path: string, city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "historico_cobertura");
  const suffix = params.toString();
  return suffix ? (`${path}?${suffix}` as Route) : (path as Route);
}

function trendVariant(trend: TerritorialCoverageHistoryZoneRow["trend"]) {
  if (trend === "melhorou") return "accent";
  if (trend === "piorou") return "danger";
  if (trend === "estagnado") return "secondary";
  return "outline";
}

function trendLabel(trend: TerritorialCoverageHistoryZoneRow["trend"]) {
  if (trend === "melhorou") return "melhorou";
  if (trend === "piorou") return "piorou";
  if (trend === "estagnado") return "estagnado";
  return "sem histórico";
}

function stateVariant(state: TerritorialCoverageHistoryZoneRow["coverageState"]) {
  if (state === "boa") return "accent";
  if (state === "fraca") return "warning";
  return "danger";
}

function ratio(value: number) {
  return `${Math.round(value * 100)}%`;
}

function trendSummary(zone: TerritorialCoverageHistoryZoneRow) {
  if (zone.previousCoverageRatio === null) return "sem comparação anterior";
  const delta = zone.coverageRatio - zone.previousCoverageRatio;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${Math.round(delta * 100)} pp vs. snapshot anterior`;
}

function TerritoryActions({ city, neighborhood }: { city: string; neighborhood?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={territoryHref("/postos/cadastrar", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">Abrir semeadura neste bairro</Link>
      <Link href={territoryHref("/postos/sem-atualizacao", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver postos sem atualização</Link>
      <Link href={territoryHref("/admin/ops/qualidade", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Abrir curadoria deste território</Link>
      <Link href={territoryHref("/admin/ops/station-editors", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver editores que atuaram aqui</Link>
    </div>
  );
}

function SeriesChips({ series }: { series: TerritorialCoverageHistoryZoneRow["series"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {series.slice(-5).map((point) => <span key={point.snapshotDate} className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] text-white/58">{point.snapshotDate.slice(5)} · {ratio(point.coverageRatio)}</span>)}
    </div>
  );
}

function ZoneHistoryCard({ zone }: { zone: TerritorialCoverageHistoryZoneRow }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-white">{zone.city}</p>
            <Badge variant={stateVariant(zone.coverageState) as any}>{zone.coverageState}</Badge>
            <Badge variant={trendVariant(zone.trend) as any}>{trendLabel(zone.trend)}</Badge>
          </div>
          <p className="text-sm text-white/54">{zone.neighborhood}</p>
          <p className="text-[11px] text-white/42">{zone.snapshotCount} snapshots · {zone.stations} postos · {zone.stationsWithRecentPrice} com preço recente · {zone.stationsInReview} em revisão</p>
          <p className="text-[11px] text-white/42">{trendSummary(zone)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Cobertura</p>
          <p className="text-2xl font-semibold text-white">{ratio(zone.coverageRatio)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{zone.signals.slice(0, 4).map((signal) => <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">{signal}</Badge>)}</div>
      <div className="mt-3"><SeriesChips series={zone.series} /></div>
      <div className="mt-3">{TerritoryActions({ city: zone.city, neighborhood: zone.neighborhood })}</div>
    </div>
  );
}

function CityHistoryCard({ city }: { city: TerritorialCoverageHistoryCityRow }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-white">{city.city}</p>
            <Badge variant={stateVariant(city.coverageState) as any}>{city.coverageState}</Badge>
            <Badge variant={trendVariant(city.trend) as any}>{trendLabel(city.trend)}</Badge>
          </div>
          <p className="text-[11px] text-white/42">{city.snapshotCount} snapshots · {city.stations} postos · {city.stationsWithRecentPrice} com preço recente · {city.stationsInReview} em revisão</p>
          <p className="text-[11px] text-white/42">{trendSummary(city)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Cobertura</p>
          <p className="text-2xl font-semibold text-white">{ratio(city.coverageRatio)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{city.series.slice(-5).map((point) => <span key={point.snapshotDate} className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] text-white/58">{point.snapshotDate.slice(5)} · {ratio(point.coverageRatio)}</span>)}</div>
      <div className="mt-3">{TerritoryActions({ city: city.city })}</div>
    </div>
  );
}

export default async function TerritorialCoverageHistoryPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const days = resolveDays(params.days);
  const readout = await getTerritorialCoverageHistoryReadout(days);

  return (
    <div className="space-y-6 pb-20">
      <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Histórico persistido</p>
            <h1 className="text-2xl font-semibold text-white">Cobertura territorial ao longo do tempo</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/58">Snapshots reais por cidade e bairro para acompanhar evolução, sem depender só de inferência entre janelas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAYS_OPTIONS.map((option) => <Link key={option} href={periodHref(option)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${option === days ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/15 text-white" : "border-white/10 bg-white/5 text-white/72 hover:bg-white/10"}`}>{option} dias</Link>)}
            <Link href="/admin/ops" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Voltar ao OPS</Link>
            <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Cobertura atual</Link>
            <Link href="/admin/ops/impacto-semeadura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Impacto da semeadura</Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Snapshots", value: readout.summary.snapshots, note: `janela de ${days} dias` },
            { label: "Última data", value: readout.summary.latestSnapshotDate ?? "-", note: "snapshot mais recente" },
            { label: "Cidades", value: readout.summary.cities, note: `${readout.summary.neighborhoods} bairros` },
            { label: "Boa", value: readout.summary.goodZones, note: "base útil" },
            { label: "Fraca", value: readout.summary.weakZones, note: "precisa densificar" },
            { label: "Vazia", value: readout.summary.emptyZones, note: "sem cobertura" }
          ].map((item) => <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p><p className="mt-1 text-[11px] text-white/42">{item.note}</p></div>)}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-[0.2em] text-white/42">Evolução por cidade</p><h2 className="mt-1 text-xl font-semibold text-white">Como a base mudou em cada cidade</h2><p className="mt-1 text-sm text-white/54">Mostra o último estado, a comparação com o snapshot anterior e a trilha recente.</p></div>
          <Badge variant="outline">{readout.cities.length} cidades</Badge>
        </div>

        <div className="space-y-3">{readout.cities.map((city) => <CityHistoryCard key={city.city} city={city} />)}</div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard className="space-y-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-white/42">Bairros que melhoraram</p><h2 className="mt-1 text-xl font-semibold text-white">Saiu de cobertura fraca ou vazia</h2></div><Badge variant="outline">{readout.improvedNeighborhoods.length}</Badge></div>
          <div className="space-y-3">{readout.improvedNeighborhoods.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhuma melhora registrada no recorte.</div> : readout.improvedNeighborhoods.slice(0, 8).map((zone) => <ZoneHistoryCard key={`${zone.city}-${zone.neighborhood}`} zone={zone} />)}</div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-white/42">Bairros estagnados</p><h2 className="mt-1 text-xl font-semibold text-white">Continuam sem mudança útil</h2></div><Badge variant="outline">{readout.stalledNeighborhoods.length}</Badge></div>
          <div className="space-y-3">{readout.stalledNeighborhoods.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum bairro ficou estagnado no recorte.</div> : readout.stalledNeighborhoods.slice(0, 8).map((zone) => <ZoneHistoryCard key={`${zone.city}-${zone.neighborhood}`} zone={zone} />)}</div>
        </SectionCard>
      </div>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-white/42">Leitura operacional</p><h2 className="mt-1 text-xl font-semibold text-white">Como usar esta tela</h2></div><Badge variant="outline">operacional</Badge></div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60"><p className="font-semibold text-white">Evolução real</p><p className="mt-1">Use para ver se o bairro saiu de vazio para fraco e de fraco para bom com snapshots verdadeiros.</p></div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60"><p className="font-semibold text-white">Mutirão</p><p className="mt-1">Priorize bairros melhorados para replicar o padrão e os estagnados para nova semeadura.</p></div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60"><p className="font-semibold text-white">Compatibilidade</p><p className="mt-1">A leitura de impacto continua disponível, mas agora há um histórico persistido para acompanhar o tempo.</p></div>
        </div>
      </SectionCard>
    </div>
  );
}
