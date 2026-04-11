"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Route } from "next";
import { ArrowRight, Clock3, MapPinned, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { SectionCard } from "@/components/ui/section-card";
import { getSelectedStationReport, type FuelFilter } from "@/lib/filters/public";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { formatDistanceFromYou } from "@/lib/geo/distance";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { trackProductEvent } from "@/lib/telemetry/client";
import { getStationPublicName } from "@/lib/quality/stations";
import type { FuelType, PriceReport, StationWithReports } from "@/lib/types";
import { cn } from "@/lib/utils";

const HomeMapSurface = dynamic(() => import("@/components/home/home-map-surface").then((mod) => mod.HomeMapSurface), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-[22px] border border-white/8 bg-white/[0.04]" />
});

type ContextKey = "near" | "neighborhood" | "city" | "stale";
type ActiveTab = "summary" | ContextKey;
type StationReport = NonNullable<ReturnType<typeof getSelectedStationReport>>;

interface CandidateEntry {
  station: StationWithReports;
  report: StationReport;
  distance: number | null;
  recencyTone: ReturnType<typeof getRecencyTone>;
}

interface AggregatedEntry extends CandidateEntry {
  contexts: ContextKey[];
}

interface HomeSimplifiedSectionsProps {
  contextHref: string;
  fuelFilter: FuelFilter;
  orderedStations: StationWithReports[];
  mapStations: StationWithReports[];
  noRecentStations: StationWithReports[];
  railSendHref: Route;
  selectedCity: string;
  center: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number; accuracy: number; trustStatus: "confiável" | "provável" | "incerto"; speed: number | null } | null;
  onStationTrack?: (scopeId: string) => void;
}

const TAB_ORDER: ContextKey[] = ["near", "neighborhood", "city", "stale"];

const TAB_META: Record<ActiveTab, { label: string; title: string; note: string }> = {
  summary: {
    label: "Resumo",
    title: "Mais opções sem repetir posto",
    note: "Os mesmos líderes entram uma vez só, com badges de contexto."
  },
  near: {
    label: "Perto",
    title: "Mais perto de você",
    note: "Preço útil no caminho agora."
  },
  neighborhood: {
    label: "Bairro",
    title: "Leituras fortes por bairro",
    note: "Um líder por bairro antes de repetir posto."
  },
  city: {
    label: "Cidade",
    title: "Leituras fortes no recorte",
    note: "Boa visão geral quando o recorte abre comparação."
  },
  stale: {
    label: "Desatualizado",
    title: "Preço bom, mas envelhecido",
    note: "Serve como pista, não como promessa."
  }
};

function getStationHref(stationId: string, returnToHref?: string, fuel?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  if (fuel && fuel !== "all") {
    params.set("fuel", fuel);
  }
  if (returnToHref) {
    params.set("returnTo", returnToHref);
  }

  const suffix = params.toString();
  return suffix ? (`/postos/${stationId}?${suffix}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuel?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  params.set("stationId", stationId);
  if (fuel && fuel !== "all") {
    params.set("fuel", fuel);
  }
  if (returnToHref) {
    params.set("returnTo", returnToHref);
  }

  return (`/enviar?${params.toString()}#photo` as Route);
}

function getDistanceValue(station: StationWithReports) {
  const distance = Number(station.distance);
  return Number.isFinite(distance) && distance >= 0 ? distance : null;
}

function resolvePrimaryFuel(orderedStations: StationWithReports[], requestedFuel: FuelFilter): FuelType {
  if (requestedFuel !== "all") {
    return requestedFuel;
  }

  const counts = new Map<FuelType, number>();
  for (const station of orderedStations) {
    for (const report of [...station.recentReports, ...station.latestReports]) {
      counts.set(report.fuelType, (counts.get(report.fuelType) ?? 0) + 1);
    }
  }

  if (counts.has("gasolina_comum")) {
    return "gasolina_comum";
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "gasolina_comum";
}

function candidateSort(left: CandidateEntry, right: CandidateEntry) {
  const toneRank = { fresh: 0, warning: 1, stale: 2 } as const;
  const toneDiff = toneRank[left.recencyTone] - toneRank[right.recencyTone];
  if (toneDiff !== 0) return toneDiff;

  const priceDiff = Number(left.report.price) - Number(right.report.price);
  if (priceDiff !== 0) return priceDiff;

  const leftDistance = left.distance ?? Number.MAX_SAFE_INTEGER;
  const rightDistance = right.distance ?? Number.MAX_SAFE_INTEGER;
  if (leftDistance !== rightDistance) return leftDistance - rightDistance;

  return new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime();
}

function getScopeLabel(context: ContextKey) {
  if (context === "near") return "Perto";
  if (context === "neighborhood") return "Bairro";
  if (context === "city") return "Cidade";
  return "Desatualizado";
}

function buildSupport(entry: AggregatedEntry) {
  if (entry.contexts.includes("stale")) {
    return "Preço chama atenção, mas já ficou velho.";
  }
  if (entry.contexts.includes("near") && entry.contexts.includes("neighborhood")) {
    return "Bom no caminho e também lidera o bairro.";
  }
  if (entry.contexts.includes("near")) {
    return "Melhor leitura útil no caminho agora.";
  }
  if (entry.contexts.includes("neighborhood")) {
    return "Lidera o bairro sem inflar a lista.";
  }
  if (entry.contexts.includes("city")) {
    return "Melhor leitura ampla do recorte agora.";
  }
  return "Boa opção para abrir o posto e decidir rápido.";
}

function dedupeScopeEntries(groups: Record<ContextKey, CandidateEntry[]>) {
  const merged = new Map<string, AggregatedEntry>();

  for (const context of TAB_ORDER) {
    for (const item of groups[context]) {
      const current = merged.get(item.station.id);
      if (!current) {
        merged.set(item.station.id, { ...item, contexts: [context] });
        continue;
      }

      if (!current.contexts.includes(context)) {
        current.contexts.push(context);
      }

      if (candidateSort(item, current) < 0) {
        merged.set(item.station.id, { ...item, contexts: current.contexts });
      }
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftPrimary = TAB_ORDER.findIndex((item) => left.contexts.includes(item));
    const rightPrimary = TAB_ORDER.findIndex((item) => right.contexts.includes(item));
    if (leftPrimary !== rightPrimary) return leftPrimary - rightPrimary;
    return candidateSort(left, right);
  });
}

function buildGroupLeaders(candidates: CandidateEntry[], getGroupKey: (entry: CandidateEntry) => string) {
  const groups = new Map<string, CandidateEntry[]>();

  for (const entry of candidates) {
    const key = getGroupKey(entry);
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map((entries) => [...entries].sort(candidateSort)[0])
    .filter((entry): entry is CandidateEntry => Boolean(entry))
    .sort(candidateSort)
    .slice(0, 3);
}

function CompactOptionCard({
  entry,
  fuel,
  contextHref,
  averageGap,
  showContextBadges,
  support,
  onTrack,
  className
}: {
  entry: AggregatedEntry;
  fuel: FuelType;
  contextHref: string;
  averageGap: number | null;
  showContextBadges: boolean;
  support: string;
  onTrack?: (scopeId: string) => void;
  className?: string;
}) {
  const stationHref = getStationHref(entry.station.id, contextHref, fuel);
  const sendHref = getSendHref(entry.station.id, contextHref, fuel);
  const localityLabel = [entry.station.neighborhood, entry.station.city].filter(Boolean).join(" · ") || "Recorte aberto";

  return (
    <div className={cn("rounded-[18px] border border-white/8 bg-black/20 p-3.5 sm:rounded-[20px] sm:p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white sm:text-base">{getStationPublicName(entry.station)}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/34">{localityLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-black tracking-tight text-white sm:text-2xl">{formatCurrencyBRL(Number(entry.report.price))}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">{fuelLabels[entry.report.fuelType]}</p>
        </div>
      </div>

      <p className="mt-1.5 truncate text-[13px] text-white/50 sm:mt-2 sm:text-sm">{support}</p>

      <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
        {showContextBadges ? entry.contexts.map((context) => (
          <Badge key={`${entry.station.id}-${context}`} variant={context === "stale" ? "warning" : "secondary"} className="text-[10px]">
            {getScopeLabel(context)}
          </Badge>
        )) : null}
        <Badge variant={recencyToneToBadgeVariant(entry.recencyTone)} className="text-[10px]">{formatRecencyLabel(entry.report.reportedAt)}</Badge>
        {entry.distance !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(entry.distance)}</Badge> : null}
        {averageGap !== null && averageGap >= 0.03 ? <Badge variant="accent" className="text-[10px]">{formatCurrencyBRL(averageGap)} abaixo da média</Badge> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
        <ButtonLink
          href={stationHref}
          variant="secondary"
          className="min-h-9 justify-center px-3 text-[9px] font-black uppercase tracking-[0.14em] sm:min-h-10 sm:px-4 sm:text-[10px] sm:tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            onTrack?.(`home-option-${entry.station.id}`);
          }}
        >
          Ver posto
        </ButtonLink>
        <ButtonLink
          href={sendHref}
          className="min-h-9 justify-center px-3 text-[9px] font-black uppercase tracking-[0.14em] sm:min-h-10 sm:px-4 sm:text-[10px] sm:tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            void trackProductEvent({
              eventType: "quick_action_clicked",
              pagePath: sendHref,
              pageTitle: "Home",
              stationId: entry.station.id,
              scopeType: "block",
              scopeId: "home-collapsed-option",
              payload: {
                source: "home_simplified",
                action: "photo",
                fuelType: fuel,
                contexts: entry.contexts
              }
            });
          }}
        >
          Atualizar preço
        </ButtonLink>
      </div>
    </div>
  );
}

function CompactCollaborationCard({
  station,
  contextHref,
  fuel,
  onTrack
}: {
  station: StationWithReports;
  contextHref: string;
  fuel: FuelType;
  onTrack?: (scopeId: string) => void;
}) {
  const fallbackReport = getSelectedStationReport(station, fuel) ?? station.latestReports[0] ?? null;
  const sendHref = getSendHref(station.id, contextHref, fuel);
  const stationHref = getStationHref(station.id, contextHref, fuel);
  const localityLabel = [station.neighborhood, station.city].filter(Boolean).join(" · ") || "Recorte aberto";
  const distance = getDistanceValue(station);

  return (
    <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{getStationPublicName(station)}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/34">{localityLabel}</p>
        </div>
        {distance !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(distance)}</Badge> : null}
      </div>

      <p className="mt-2 truncate text-sm text-white/54">{fallbackReport ? `Última leitura ${formatRecencyLabel(fallbackReport.reportedAt)}.` : "Ainda sem preço recente aprovado."}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="warning" className="text-[10px]">Falta preço</Badge>
        {fallbackReport ? <Badge variant="secondary" className="text-[10px]">{fuelLabels[fallbackReport.fuelType]} · {formatCurrencyBRL(Number(fallbackReport.price))}</Badge> : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ButtonLink
          href={sendHref}
          className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
            onTrack?.(`home-collaborate-${station.id}`);
          }}
        >
          Enviar agora
        </ButtonLink>
        <ButtonLink href={stationHref} variant="secondary" className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]">
          Ver posto
        </ButtonLink>
      </div>
    </div>
  );
}

export function HomeSimplifiedSections({
  contextHref,
  fuelFilter,
  orderedStations,
  mapStations,
  noRecentStations,
  railSendHref,
  selectedCity,
  center,
  userLocation,
  onStationTrack
}: HomeSimplifiedSectionsProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [showMap, setShowMap] = useState(false);

  const primaryFuel = useMemo(() => resolvePrimaryFuel(orderedStations, fuelFilter), [fuelFilter, orderedStations]);

  const candidates = useMemo(() => {
    return orderedStations
      .map((station) => {
        const report = getSelectedStationReport(station, primaryFuel);
        if (!report) {
          return null;
        }

        return {
          station,
          report,
          distance: getDistanceValue(station),
          recencyTone: getRecencyTone(report.reportedAt)
        } satisfies CandidateEntry;
      })
      .filter((item): item is CandidateEntry => Boolean(item));
  }, [orderedStations, primaryFuel]);

  const freshCandidates = useMemo(() => candidates.filter((item) => item.recencyTone !== "stale"), [candidates]);
  const staleCandidates = useMemo(() => candidates.filter((item) => item.recencyTone === "stale"), [candidates]);

  const nearCandidates = useMemo(() => {
    return [...freshCandidates]
      .filter((item) => item.distance !== null)
      .sort((left, right) => {
        const leftDistance = left.distance ?? Number.MAX_SAFE_INTEGER;
        const rightDistance = right.distance ?? Number.MAX_SAFE_INTEGER;
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
        return candidateSort(left, right);
      })
      .slice(0, 3);
  }, [freshCandidates]);

  const neighborhoodCandidates = useMemo(() => {
    const scoped = freshCandidates.length > 0 ? freshCandidates : candidates;
    const uniqueNeighborhoods = new Set(scoped.map((item) => String(item.station.neighborhood ?? "").trim()).filter(Boolean));
    if (uniqueNeighborhoods.size <= 1) {
      return [...scoped].sort(candidateSort).slice(0, 3);
    }

    return buildGroupLeaders(scoped, (entry) => String(entry.station.neighborhood ?? "").trim() || String(entry.station.city ?? "").trim() || "sem-bairro");
  }, [candidates, freshCandidates]);

  const cityCandidates = useMemo(() => {
    const scoped = freshCandidates.length > 0 ? freshCandidates : candidates;
    const uniqueCities = new Set(scoped.map((item) => String(item.station.city ?? "").trim()).filter(Boolean));
    if (uniqueCities.size <= 1) {
      return [...scoped].sort(candidateSort).slice(0, 3);
    }

    return buildGroupLeaders(scoped, (entry) => String(entry.station.city ?? "").trim() || "sem-cidade");
  }, [candidates, freshCandidates]);

  const staleOptions = useMemo(() => [...staleCandidates].sort(candidateSort).slice(0, 3), [staleCandidates]);

  const scopeGroups = useMemo(() => ({
    near: nearCandidates,
    neighborhood: neighborhoodCandidates,
    city: cityCandidates,
    stale: staleOptions
  }), [cityCandidates, nearCandidates, neighborhoodCandidates, staleOptions]);

  const summaryEntries = useMemo(() => dedupeScopeEntries(scopeGroups).slice(0, 3), [scopeGroups]);

  const averageFreshPrice = useMemo(() => {
    if (freshCandidates.length < 2) {
      return null;
    }

    const sum = freshCandidates.reduce((total, item) => total + Number(item.report.price), 0);
    return sum / freshCandidates.length;
  }, [freshCandidates]);

  const bestNow = useMemo(() => {
    const lead = summaryEntries.find((entry) => entry.recencyTone !== "stale") ?? summaryEntries[0] ?? null;
    if (!lead) {
      return null;
    }

    const delta = averageFreshPrice === null ? null : Math.max(0, averageFreshPrice - Number(lead.report.price));
    return {
      entry: lead,
      delta
    };
  }, [averageFreshPrice, summaryEntries]);

  const visibleOptionEntries = useMemo(() => {
    if (activeTab === "summary") {
      return summaryEntries;
    }

    return dedupeScopeEntries({
      near: activeTab === "near" ? scopeGroups.near : [],
      neighborhood: activeTab === "neighborhood" ? scopeGroups.neighborhood : [],
      city: activeTab === "city" ? scopeGroups.city : [],
      stale: activeTab === "stale" ? scopeGroups.stale : []
    }).slice(0, 3);
  }, [activeTab, scopeGroups, summaryEntries]);

  const optionsCount = visibleOptionEntries.length;
  const collaborationTitle = selectedCity ? `Colaborar agora em ${selectedCity}` : "Colaborar agora";

  return (
    <div className="space-y-4">
      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Melhor agora</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Uma leitura principal para decidir rápido</h2>
            <p className="mt-1 text-sm text-white/52">Preço, recência e caminho em um card só.</p>
          </div>
          <Badge variant="warning" className="text-[10px]">{fuelLabels[primaryFuel]}</Badge>
        </div>

        {!bestNow ? (
          <EmptyStateCard
            title="Ainda não apareceu uma leitura forte neste recorte."
            description="Abra as opções abaixo ou envie o primeiro preço útil para destravar a home curta."
            actionHref={railSendHref}
            actionLabel="Enviar preço"
            className="text-left"
          />
        ) : (
          <div className="rounded-[24px] border border-[color:var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(255,199,0,0.12),rgba(255,255,255,0.03))] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{getStationPublicName(bestNow.entry.station)}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/34">{[bestNow.entry.station.neighborhood, bestNow.entry.station.city].filter(Boolean).join(" · ") || "Recorte aberto"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[2rem] font-black tracking-tight text-white">{formatCurrencyBRL(Number(bestNow.entry.report.price))}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{fuelLabels[bestNow.entry.report.fuelType]}</p>
              </div>
            </div>

            <p className="mt-3 truncate text-sm text-white/56">{buildSupport(bestNow.entry)}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {bestNow.entry.contexts.map((context) => (
                <Badge key={`best-${context}`} variant={context === "stale" ? "warning" : "secondary"} className="text-[10px]">
                  {getScopeLabel(context)}
                </Badge>
              ))}
              <Badge variant={recencyToneToBadgeVariant(bestNow.entry.recencyTone)} className="text-[10px]">{formatRecencyLabel(bestNow.entry.report.reportedAt)}</Badge>
              {bestNow.entry.distance !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(bestNow.entry.distance)}</Badge> : null}
              {bestNow.delta !== null && bestNow.delta >= 0.03 ? <Badge variant="accent" className="text-[10px]">{formatCurrencyBRL(bestNow.delta)} abaixo da média</Badge> : null}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <ButtonLink href={getStationHref(bestNow.entry.station.id, contextHref, primaryFuel)} variant="secondary" className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]">
                Ver posto
              </ButtonLink>
              <ButtonLink href={getSendHref(bestNow.entry.station.id, contextHref, primaryFuel)} className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]">
                Atualizar preço
              </ButtonLink>
              <ButtonLink href={"/atualizacoes" as Route} variant="ghost" className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/72">
                Ver análise
              </ButtonLink>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mais opções</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Perto, bairro, cidade e preço envelhecido</h2>
            <p className="mt-1 text-[13px] text-white/52 sm:text-sm">Uma superfície só, com chips para abrir o recorte certo.</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{optionsCount} no foco</Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(Object.keys(TAB_META) as ActiveTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  void trackProductEvent({
                    eventType: "quick_action_clicked",
                    pagePath: "/",
                    pageTitle: "Home",
                    scopeType: "block",
                    scopeId: "home-more-options-tab",
                    payload: {
                      source: "home_simplified",
                      tab
                    }
                  });
                }}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.16em]",
                  isActive
                    ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-black"
                    : "border-white/10 bg-white/[0.04] text-white/62 hover:border-white/20 hover:bg-white/[0.08]"
                )}
              >
                {TAB_META[tab].label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5 sm:rounded-[20px] sm:px-4 sm:py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{TAB_META[activeTab].title}</p>
          <p className="mt-1 hidden text-sm text-white/52 sm:block">{TAB_META[activeTab].note}</p>
          <p className="mt-1 text-[12px] text-white/46 sm:hidden">Recorte direto, sem repetir posto.</p>
        </div>

        {visibleOptionEntries.length === 0 ? (
          <EmptyStateCard
            title="Sem opções úteis para este recorte agora."
            description="Tente abrir outro chip ou entrar direto na colaboração para puxar um preço novo."
            actionHref={railSendHref}
            actionLabel="Enviar preço"
            className="text-left"
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleOptionEntries.map((entry, index) => (
              <CompactOptionCard
                key={`${activeTab}-${entry.station.id}`}
                entry={entry}
                fuel={primaryFuel}
                contextHref={contextHref}
                averageGap={averageFreshPrice === null ? null : Math.max(0, averageFreshPrice - Number(entry.report.price))}
                showContextBadges={activeTab === "summary"}
                support={buildSupport(entry)}
                onTrack={onStationTrack}
                className={index > 1 ? "hidden sm:block" : undefined}
              />
            ))}
          </div>
        )}

        {visibleOptionEntries.length > 2 ? (
          <p className="text-[11px] text-white/40 sm:hidden">Mais 1 opção continua disponível acima da dobra maior.</p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {mapStations.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowMap((value) => !value)}
              className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]"
            >
              <MapPinned className="h-4 w-4" />
              {showMap ? "Fechar mapa" : "Abrir mapa"}
            </Button>
          ) : null}
          <ButtonLink href={"/atualizacoes" as Route} variant="secondary" className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
            Ver atualizações
          </ButtonLink>
          <ButtonLink href={railSendHref} className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
            Atualizar preço
          </ButtonLink>
        </div>

        {showMap ? (
          <div className="pt-1">
            <HomeMapSurface
              stations={mapStations}
              contextHref={contextHref}
              fuelFilter={fuelFilter}
              center={center}
              userLocation={userLocation}
              preferListFirst={false}
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Colaborar agora</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{collaborationTitle}</h2>
            <p className="mt-1 text-sm text-white/52">Postos sem atualização por perto para você destravar o recorte.</p>
          </div>
          <Badge variant={noRecentStations.length > 0 ? "warning" : "secondary"} className="text-[10px]">
            {noRecentStations.length > 0 ? `${noRecentStations.length} pontos` : "Coberto"}
          </Badge>
        </div>

        {noRecentStations.length === 0 ? (
          <EmptyStateCard
            title="Sem lacuna urgente neste recorte."
            description="A cobertura está boa. Se quiser aprofundar, abra as atualizações ou mude o recorte no topo."
            actionHref={"/atualizacoes" as Route}
            actionLabel="Ver atualizações"
            className="text-left"
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {noRecentStations.slice(0, 3).map((station) => (
              <CompactCollaborationCard
                key={station.id}
                station={station}
                contextHref={contextHref}
                fuel={primaryFuel}
                onTrack={onStationTrack}
              />
            ))}
          </div>
        )}

        <ButtonLink href={"/postos/sem-atualizacao" as Route} variant="secondary" className="h-11 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
          Ver lista completa
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </SectionCard>
    </div>
  );
}