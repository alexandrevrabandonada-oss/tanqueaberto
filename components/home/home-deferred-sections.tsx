"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Camera, Clock3, Navigation, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { StationCard } from "@/components/station/station-card";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { QuickActionButton } from "@/components/ui/quick-action";
import { OperationalMemoryBar } from "@/components/home/operational-memory-bar";
import { HomeMapSurface } from "@/components/home/home-map-surface";
import { RecorteActivityWidget } from "@/components/home/recorte-activity-widget";
import { MySubmissionsList } from "@/components/history/my-submissions-list";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/geo/distance";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters } from "@/lib/format/labels";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { getSelectedStationReport, hasRecentStationPriceForFilter } from "@/lib/filters/public";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { openExternalNavigation } from "@/lib/navigation/external-maps";
import { trackProductEvent } from "@/lib/telemetry/client";
import type { FuelType } from "@/lib/types";

const ECONOMY_FUEL_STORAGE_KEY = "bomba-aberta:economy-fuel-filter";
const ECONOMY_FUEL_OPTIONS = publicFuelFilters.filter((item) => item.value !== "all") as Array<{ value: FuelType; label: string }>;

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? `/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` : `/postos/${stationId}`;
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: string) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  const base = `/enviar?stationId=${stationId}${fuelParam}#photo`;
  return returnToHref ? `${base}&returnTo=${encodeURIComponent(returnToHref)}` : base;
}

function getReportConfidenceMeta(report: any) {
  const evidenceMode = String(report?.metadata?.evidence_mode ?? "");
  if (evidenceMode === "sem_placa_faixa") {
    return { label: "Confianca moderada", detail: "Sem placa", variant: "warning" as const };
  }
  if (report?.locationConfidence === "high") {
    return { label: "Confianca alta", detail: "GPS forte", variant: "default" as const };
  }
  if (report?.locationConfidence === "low") {
    return { label: "Confianca media", detail: "GPS razoavel", variant: "warning" as const };
  }
  return { label: "Confianca basica", detail: "Vale checar", variant: "secondary" as const };
}

function hasRouteCoordinates(station: any) {
  return Number.isFinite(Number(station?.lat)) && Number.isFinite(Number(station?.lng));
}

function dedupeStationItems(items: Array<{ station: any; report: any; key?: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const stationId = String(item?.station?.id ?? "");
    if (!stationId || seen.has(stationId)) return false;
    seen.add(stationId);
    return true;
  });
}

function getEconomyLocalityLabel(station: any) {
  return [station?.neighborhood, station?.city].filter(Boolean).join(" · ") || "Regiao sem bairro";
}

function isFuelType(value: string): value is FuelType {
  return ECONOMY_FUEL_OPTIONS.some((item) => item.value === value);
}

function readEconomyFuelPreference() {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(ECONOMY_FUEL_STORAGE_KEY);
  return saved && isFuelType(saved) ? saved : null;
}

function pickBetterEconomyCandidate(current: any, next: any) {
  if (!current) return next;
  if (next.report.price !== current.report.price) {
    return next.report.price < current.report.price ? next : current;
  }
  return new Date(next.report.reportedAt).getTime() > new Date(current.report.reportedAt).getTime() ? next : current;
}
export function HomeDeferredSections(props: Record<string, any>) {
  const {
    homeState,
    missionActive,
    isStreetMode,
    isAssisted,
    toggleStreetMode,
    recentIds = [],
    favoriteIds = [],
    stations = [],
    recentCount = 0,
    selectedCity = "",
    selectedReadiness,
    contextHref = "/",
    fuelFilter = "all",
    listMode = "normal",
    isLowPerf = false,
    recordActivity,
    toggleFavorite,
    isFavorite,
    startMission,
    mapStations = [],
    summaryStations = [],
    priorityStations = [],
    priorityLabel = "",
    priorityHint = "",
    noRecentStations = [],
    cheapestNow = [],
    filteredFeed = [],
    orderedStations = [],
    stationsWithRecentPrice = [],
    stationsWithoutRecentPrice = 0,
    railSendHref = "/enviar",
    isHeroCollapsed = false,
    role,
    selectedCityLabel = selectedCity,
    onQuickAccessTrack,
    onRouteTrack,
    onStationTrack
  } = props;

  const [economyFuelFilter, setEconomyFuelFilter] = useState<FuelType>("gasolina_comum");
  const availableEconomyFuels = useMemo(() => {
    const seen = new Set<FuelType>();

    for (const station of orderedStations as any[]) {
      for (const report of [...(station?.recentReports ?? []), ...(station?.latestReports ?? [])]) {
        if (isFuelType(String(report?.fuelType ?? ""))) {
          seen.add(report.fuelType as FuelType);
        }
      }
    }

    return ECONOMY_FUEL_OPTIONS.filter((item) => seen.has(item.value)).map((item) => item.value);
  }, [orderedStations]);

  useEffect(() => {
    const available = availableEconomyFuels.length > 0 ? availableEconomyFuels : ECONOMY_FUEL_OPTIONS.map((item) => item.value);
    const saved = readEconomyFuelPreference();
    const routeFuel = fuelFilter !== "all" && isFuelType(fuelFilter) ? fuelFilter : null;

    setEconomyFuelFilter((current) => {
      if (available.includes(current)) {
        return current;
      }
      if (routeFuel && available.includes(routeFuel)) {
        return routeFuel;
      }
      if (saved && available.includes(saved)) {
        return saved;
      }
      if (available.includes("gasolina_comum")) {
        return "gasolina_comum";
      }
      return available[0] ?? "gasolina_comum";
    });
  }, [availableEconomyFuels, fuelFilter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ECONOMY_FUEL_STORAGE_KEY, economyFuelFilter);
  }, [economyFuelFilter]);

  const showQuickAccess = homeState?.showQuickAccess && !missionActive && (recentIds.length > 0 || favoriteIds.length > 0);
  const priceCandidates = orderedStations
    .map((station: any) => ({ station, report: getSelectedStationReport(station, economyFuelFilter) }))
    .filter((item: any) => item.report);
  const cheapestRecent = dedupeStationItems(
    priceCandidates
      .filter(({ report }: any) => getRecencyTone(report.reportedAt) !== "stale")
      .sort((left: any, right: any) => {
        const priceDiff = left.report.price - right.report.price;
        if (priceDiff !== 0) return priceDiff;
        return new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime();
      })
  ).slice(0, 3);
  const cheapestNearYou = dedupeStationItems(
    cheapestNow
      .map((entry: any) => entry?.station && entry?.report ? entry : { station: entry, report: getSelectedStationReport(entry, economyFuelFilter) })
      .filter((item: any) => item.station && item.report)
      .sort((left: any, right: any) => {
        const leftDistance = Number.isFinite(left.station?.distance) ? left.station.distance : Number.MAX_SAFE_INTEGER;
        const rightDistance = Number.isFinite(right.station?.distance) ? right.station.distance : Number.MAX_SAFE_INTEGER;
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
        return left.report.price - right.report.price;
      })
  ).slice(0, 3);
  const cheapestByNeighborhood = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; item: any; count: number }>();

    for (const item of priceCandidates) {
      const key = String(item.station?.neighborhood ?? "").trim() || String(item.station?.city ?? "").trim() || "sem-bairro";
      const label = String(item.station?.neighborhood ?? "").trim() || String(item.station?.city ?? "").trim() || "Regiao sem bairro";
      const current = groups.get(key);

      groups.set(key, {
        key,
        label,
        item: pickBetterEconomyCandidate(current?.item ?? null, item),
        count: (current?.count ?? 0) + 1
      });
    }

    return Array.from(groups.values())
      .sort((left, right) => {
        const priceDiff = left.item.report.price - right.item.report.price;
        if (priceDiff !== 0) return priceDiff;
        return right.count - left.count;
      })[0] ?? null;
  }, [priceCandidates]);
  const cheapestByCity = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; item: any; count: number }>();

    for (const item of priceCandidates) {
      const key = String(item.station?.city ?? "").trim() || "sem-cidade";
      const label = String(item.station?.city ?? "").trim() || "Cidade sem nome";
      const current = groups.get(key);

      groups.set(key, {
        key,
        label,
        item: pickBetterEconomyCandidate(current?.item ?? null, item),
        count: (current?.count ?? 0) + 1
      });
    }

    return Array.from(groups.values())
      .sort((left, right) => {
        const priceDiff = left.item.report.price - right.item.report.price;
        if (priceDiff !== 0) return priceDiff;
        return right.count - left.count;
      })[0] ?? null;
  }, [priceCandidates]);
  const cheapestStale = dedupeStationItems(
    priceCandidates
      .filter(({ report }: any) => getRecencyTone(report.reportedAt) === "stale")
      .sort((left: any, right: any) => {
        const priceDiff = left.report.price - right.report.price;
        if (priceDiff !== 0) return priceDiff;
        return new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime();
      })
  ).slice(0, 3);
  const economyGroups = [
    {
      id: "recent",
      eyebrow: "Decida agora",
      title: "Mais barato recente",
      hint: "Bom preço com atualização fresca para decidir sem rodeio.",
      items: cheapestRecent,
      empty: "Ainda nao apareceu um preço bom e recente neste recorte."
    },
    {
      id: "near",
      eyebrow: "No seu caminho",
      title: "Mais barato perto",
      hint: "Aqui o preço baixo ja vem junto com a distância.",
      items: cheapestNearYou,
      empty: "Ative o GPS ou refine o recorte para comparar o que compensa perto de voce."
    },
    {
      id: "stale",
      eyebrow: "Vale conferir",
      title: "Barato, mas desatualizado",
      hint: "Pode compensar, mas ja pede uma checagem antes de sair.",
      items: cheapestStale,
      empty: "Nao ha preço barato envelhecido chamando atenção agora."
    }
  ];
  const economyReadouts = [
    {
      id: "nearby",
      title: "Perto de voce",
      hint: "Melhor preço no caminho agora",
      entry: cheapestNearYou[0] ?? null,
      context: cheapestNearYou[0]?.station?.distance ? formatDistance(cheapestNearYou[0].station.distance) : "Sem GPS forte"
    },
    {
      id: "neighborhood",
      title: "Por bairro",
      hint: "Melhor leitura no bairro do recorte",
      entry: cheapestByNeighborhood?.item ?? null,
      context: cheapestByNeighborhood?.label ?? "Sem bairro forte"
    },
    {
      id: "city",
      title: "Por cidade",
      hint: "Melhor leitura no recorte da cidade",
      entry: cheapestByCity?.item ?? null,
      context: cheapestByCity?.label ?? (selectedCityLabel || "Sem cidade definida")
    }
  ];
  const hasEconomyItems = economyGroups.some((group) => group.items.length > 0);

  function handleEconomyRoute(station: any, groupId: string) {
    if (!hasRouteCoordinates(station)) return;
    const lat = Number(station.lat);
    const lng = Number(station.lng);
    const stationName = getStationPublicName(station);
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    void onRouteTrack?.(station.id, groupId);
    void trackProductEvent({
      eventType: "quick_action_clicked",
      pagePath: "/",
      pageTitle: "Home",
      stationId: station.id,
      scopeType: "block",
      scopeId: `economy-${groupId}`,
      payload: {
        source: "economy_surface",
        action: "route",
        groupId,
        stationName,
        fuelFilter: economyFuelFilter
      }
    });

    openExternalNavigation(isMobile ? "waze" : "google", {
      lat,
      lng,
      stationId: station.id,
      stationName,
      source: `economy_${groupId}`
    });
  }
  return (
    <>
      {homeState.state !== "operation-normal" ? (
        <div className="mb-6 transition-all duration-300">
          <SectionCard className="space-y-3 border-white/8 bg-white/[0.04] py-4 xl:mb-3">
            <div className="space-y-1">
              <Badge className="text-[10px] uppercase tracking-widest">Mapa Vivo {role === 'senior' && "· Senior"}</Badge>
              <h2 className="text-2xl font-bold tracking-tight text-white xl:text-[1.6rem]">Buscar, comparar e enviar.</h2>
              <p className="text-sm leading-relaxed text-white/40 xl:max-w-xl">Veja os postos do recorte e entre no envio sem rodeio.</p>
            </div>

            <div className="flex items-center justify-between min-h-[1.5rem]">
              {selectedReadiness ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-xs text-white/40">{selectedReadiness.status === "ready" ? "✨ Recorte forte e validado." : selectedReadiness.status === "validating" ? "🧪 Recorte em validação técnica." : "🧱 Sua contribuição é útil aqui."}</span>
                  {selectedReadiness && <GroupStatusBadge status={selectedReadiness.status} className="mt-1" />}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-white/44">Comece por Volta Redonda, Barra Mansa ou Barra do Piraí.</p>
              )}

              {selectedReadiness && selectedReadiness.status !== "ready" ? (
                <Button
                  variant="primary"
                  className="h-7 px-3 text-[9px] font-bold uppercase tracking-wider rounded-lg animate-pulse"
                  onClick={() => {
                    const cityStations = stations.filter((s: any) => s?.city && selectedCity && s.city.trim().toUpperCase() === selectedCity.trim().toUpperCase());
                    const cityStationIds = cityStations.map((s: any) => s.id);
                    if (selectedReadiness) {
                      startMission(selectedReadiness.slug || "general", selectedReadiness.name || (selectedCity || "Cidade"), cityStationIds);
                    }

                    void trackProductEvent({
                      eventType: "first_fold_action" as any,
                      pagePath: "/",
                      payload: { type: "mission_start", city: selectedCity }
                    });

                    void trackProductEvent({
                      eventType: "mission_start_from_home_cta" as any,
                      pagePath: "/",
                      pageTitle: "Home",
                      payload: {
                        city: selectedCity,
                        defaultReason: null
                      }
                    });
                  }}
                >
                  Missão Coleta
                </Button>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {showQuickAccess ? (
        <SectionCard
          className="mb-4 space-y-4 p-5 border-white/10 bg-white/5 xl:hidden"
          onClick={() => {
            void onQuickAccessTrack?.();
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-[color:var(--color-accent)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Acesso Rápido</p>
            </div>
            <Badge variant="outline" className="h-5 px-2 text-[9px] border-white/10 text-white/30 font-black uppercase tracking-tighter">Polegar amigável</Badge>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {favoriteIds.map((fid: string) => {
              const s = stations.find((st: any) => st.id === fid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link
                  key={`fav-${fid}`}
                  href={getSendHref(fid, contextHref, fuelFilter) as Route}
                  className={cn("flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-yellow-400/30 bg-yellow-400/5 pl-4 pr-5 transition duration-200 active:scale-95 active:brightness-125 hover:bg-yellow-400/10", isAssisted && "border-yellow-400/50 bg-yellow-400/10")}
                  onClick={() => {
                    void onQuickAccessTrack?.(fid, "favorite");
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20">
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{displayName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-yellow-400/50">{isAssisted ? "ENVIAR FOTO" : s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
            {recentIds.filter((rid: string) => !favoriteIds.includes(rid)).map((rid: string) => {
              const s = stations.find((st: any) => st.id === rid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link
                  key={`rec-${rid}`}
                  href={getSendHref(rid, contextHref, fuelFilter) as Route}
                  className={cn("flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 pl-4 pr-5 transition duration-200 active:scale-95 active:brightness-125 hover:bg-white/10", isAssisted && "border-white/20 bg-white/8")}
                  onClick={() => {
                    void onQuickAccessTrack?.(rid, "recent");
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/42 group-hover:bg-white/20">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{displayName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/30">{isAssisted ? "RETOMAR ENVIO" : s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {homeState.state === "senior-hub" ? (
        <div className="mb-6" onClick={() => void onStationTrack?.("my_submissions") }>
          <MySubmissionsList />
        </div>
      ) : null}

      {homeState.state === "senior-hub" && selectedCity && !isLowPerf ? (
        <div className="mb-6">
          <RecorteActivityWidget city={selectedCity} groupSlug={selectedReadiness?.slug} isReady={selectedReadiness?.status === "ready"} />
        </div>
      ) : null}

      {homeState.state === "operation-normal" && !isHeroCollapsed ? (
        <SectionCard id="mapa-ao-vivo" data-hero-primary="home-map" className="space-y-3 shadow-lg shadow-black/14 xl:p-5">
          <div className="flex items-center gap-3 px-5 xl:px-0">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
                <h3 className="mt-1 text-lg font-semibold text-white xl:text-[1.25rem]">Busca, contexto e postos por perto</h3>
              </div>
              <ButtonLink href="/enviar" data-cta-inline="home-send-now" className="relative z-[1001] hidden h-9 whitespace-nowrap px-3.5 text-[11px] font-black uppercase tracking-[0.18em] md:inline-flex">Enviar preço</ButtonLink>
            </div>
          </div>
          {mapStations.length > 0 ? (
            <HomeMapSurface stations={mapStations} contextHref={contextHref} fuelFilter={fuelFilter} center={null} preferListFirst={Boolean(false)} />
          ) : (
            <EmptyStateCard
              title={"Nenhum posto disponível no momento."}
              description={"Ajuste a cidade, o combustível ou a recência para trazer um recorte útil de volta."}
              actionHref="/"
              actionLabel="Limpar recorte"
              className="text-left"
            />
          )}
        </SectionCard>
      ) : null}

      <SectionCard className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {[
          { label: "No Recorte", value: mapStations.length, note: "Postos visíveis" },
          { label: "Com Preço", value: stationsWithRecentPrice.length, note: "Recentemente" },
          { label: "Falta Atualizar", value: stationsWithoutRecentPrice, note: "Sem preço recente", tone: "warning" },
          { label: "No Ar 24h", value: recentCount, note: "Últimos envios", tone: "accent" }
        ].map((stat: any) => (
          <div key={stat.label} className="flex flex-col rounded-[18px] border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tighter ${stat.tone === 'accent' ? 'text-[color:var(--color-accent)]' : stat.tone === 'warning' ? 'text-orange-400' : 'text-white'}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-white/20">{stat.note}</p>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mais barato para abastecer</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Veja o que ainda compensa de verdade</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">Preço bom sozinho engana. Aqui o app separa o que está barato e recente, o que cabe no caminho e o que está barato, mas já pode ter mudado.</p>
          </div>
          <Badge variant="warning">{fuelLabels[economyFuelFilter]}</Badge>
        </div>

        <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Filtro principal</p>
              <p className="mt-1 text-sm text-white/58">Compare so o combustivel que voce realmente quer abastecer.</p>
            </div>
            <Badge variant="secondary">Lembra neste aparelho</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {ECONOMY_FUEL_OPTIONS.map((option) => {
              const isActive = option.value === economyFuelFilter;
              const hasData = availableEconomyFuels.length === 0 || availableEconomyFuels.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setEconomyFuelFilter(option.value);
                    void trackProductEvent({
                      eventType: "quick_action_clicked",
                      pagePath: "/",
                      pageTitle: "Home",
                      scopeType: "block",
                      scopeId: "economy-fuel-filter",
                      payload: {
                        source: "economy_surface",
                        action: "filter_fuel",
                        fuelFilter: option.value,
                        hasData
                      }
                    });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition",
                    isActive
                      ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-black"
                      : "border-white/10 bg-white/[0.04] text-white/62 hover:border-white/20 hover:bg-white/[0.08]",
                    !hasData && !isActive && "opacity-60"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-white/42">
            Cards e comparacoes abaixo agora mostram apenas <span className="font-semibold text-white/72">{fuelLabels[economyFuelFilter]}</span>.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {economyReadouts.map((readout) => {
            const report = readout.entry?.report ?? null;
            const station = readout.entry?.station ?? null;
            const confidence = report ? getReportConfidenceMeta(report) : null;
            const recencyTone = report ? getRecencyTone(report.reportedAt) : "stale";

            return (
              <div key={readout.id} className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{readout.title}</p>
                <p className="mt-1 text-sm text-white/58">{readout.hint}</p>
                {report && station ? (
                  <>
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{getStationPublicName(station)}</p>
                        <p className="mt-1 text-[11px] text-white/42">{readout.context}</p>
                      </div>
                      <p className="text-xl font-black tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={recencyTone === "fresh" ? "default" : recencyTone === "warning" ? "warning" : "danger"}>
                        {formatRecencyLabel(report.reportedAt)}
                      </Badge>
                      <Badge variant={confidence?.variant ?? "secondary"}>{confidence?.label ?? "Confianca basica"}</Badge>
                      {station.distance ? <Badge variant="secondary">{formatDistance(station.distance)}</Badge> : null}
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-white/42">Ainda nao apareceu leitura util de {fuelLabels[economyFuelFilter].toLowerCase()} neste recorte.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Recência", note: "Quanto mais novo, melhor para decidir agora." },
            { label: "Confiança", note: "Mostra se o dado chegou com contexto forte ou básico." },
            { label: "Distância", note: "Ajuda a ver quando o barato continua valendo no caminho." }
          ].map((signal) => (
            <div key={signal.label} className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{signal.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/58">{signal.note}</p>
            </div>
          ))}
        </div>

        {!hasEconomyItems ? (
          <EmptyStateCard
            title={mapStations.length > 0 ? `Há postos cadastrados, mas ainda sem ${fuelLabels[economyFuelFilter].toLowerCase()} recente neste recorte.` : `Nenhum preço de ${fuelLabels[economyFuelFilter].toLowerCase()} disponível neste recorte.`}
            description={mapStations.length > 0 ? "Abra a lista dos postos sem atualização e envie a primeira foto desse combustível onde puder." : "Tente outro bairro, cidade ou mude o combustível da comparação para voltar a um recorte útil."}
            actionHref="/postos/sem-atualizacao"
            actionLabel="Ver postos sem atualização"
            className="text-left"
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {economyGroups.map((group: any) => (
              <div key={group.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{group.eyebrow}</p>
                    <h3 className="mt-1 text-base font-semibold text-white">{group.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">{group.hint}</p>
                  </div>
                  <Badge variant="outline">{group.items.length}</Badge>
                </div>

                {group.items.length === 0 ? (
                  <p className="text-sm leading-relaxed text-white/48">{group.empty}</p>
                ) : (
                  <div className="space-y-3">
                    {group.items.map(({ station, report }: any) => {
                      const recencyTone = getRecencyTone(report.reportedAt);
                      const confidence = getReportConfidenceMeta(report);
                      const canRoute = hasRouteCoordinates(station);
                      const stationHref = getStationHref(station.id, contextHref) as Route;
                      const sendHref = getSendHref(station.id, contextHref, economyFuelFilter) as Route;

                      return (
                        <div key={report.id || `${group.id}-${station.id}`} className="rounded-[18px] border border-white/8 bg-black/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={stationHref}
                                className="block"
                                onClick={() => {
                                  rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                                  void onStationTrack?.(`economy-${group.id}`);
                                }}
                              >
                                <p className="truncate text-sm font-semibold text-white">{getStationPublicName(station)}</p>
                                <p className="mt-1 text-[11px] text-white/46">{getEconomyLocalityLabel(station)}</p>
                              </Link>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-2xl font-black tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/34">{fuelLabels[economyFuelFilter]}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]/78">{group.id === "stale" ? "Pode ter mudado" : group.id === "near" ? "Bom no caminho" : "Bom agora"}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={recencyTone === "fresh" ? "default" : recencyTone === "warning" ? "warning" : "danger"}>
                              {recencyTone === "stale" ? `Preço de ${formatRecencyLabel(report.reportedAt)}` : `Atualizado ${formatRecencyLabel(report.reportedAt)}`}
                            </Badge>
                            <Badge variant={confidence.variant}>{confidence.label}</Badge>
                            <Badge variant="secondary">{confidence.detail}</Badge>
                            {station.distance ? <Badge variant="secondary">{formatDistance(station.distance)}</Badge> : null}
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <ButtonLink
                              href={stationHref}
                              variant="secondary"
                              className="h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                              onClick={() => {
                                rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                                void onStationTrack?.(`economy-${group.id}`);
                              }}
                            >
                              Ver posto
                            </ButtonLink>
                            <ButtonLink
                              href={sendHref}
                              className="h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                              onClick={() => {
                                rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                                void trackProductEvent({
                                  eventType: "quick_action_clicked",
                                  pagePath: sendHref,
                                  pageTitle: "Home",
                                  stationId: station.id,
                                  scopeType: "block",
                                  scopeId: `economy-${group.id}`,
                                  payload: {
                                    source: "economy_surface",
                                    action: "photo",
                                    groupId: group.id,
                                    fuelFilter: economyFuelFilter
                                  }
                                });
                              }}
                            >
                              Atualizar preço desse combustível
                            </ButtonLink>
                            {canRoute ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/72 sm:col-span-2"
                                onClick={() => handleEconomyRoute(station, group.id)}
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                Traçar rota
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {noRecentStations.length > 0 ? (
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos sem atualização recente</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde ainda falta preço aprovado</h2>
            </div>
            <Link href="/postos/sem-atualizacao" className="text-sm text-[color:var(--color-accent)]">
              Ver lista completa
            </Link>
          </div>
          <div className="space-y-3">
            {noRecentStations.map((station: any) => (
              <StationCard
                key={station.id}
                station={station}
                fuelFilter={fuelFilter}
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={listMode === 'ultra-claro'}
                isAdvanced={listMode === 'avancado'}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
                recordActivity={recordActivity}
                isHeaderSticky={isHeroCollapsed || missionActive}
                isHeaderMicro={false}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Agora no mapa</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Consulta rápida</h2>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {orderedStations.length === 0 ? (
            <EmptyStateCard
              title="Nenhum posto encontrado para essa busca."
              description="Tente outra cidade, combustível ou janela de recência. Se quiser, abra os postos sem atualização para colaborar."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
              className="text-left"
            />
          ) : (
            orderedStations.map((station: any) => (
              <StationCard
                key={station.id}
                station={station}
                fuelFilter={fuelFilter}
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={listMode === 'ultra-claro'}
                isAdvanced={listMode === 'avancado'}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
                recordActivity={recordActivity}
                isHeaderSticky={isHeroCollapsed || missionActive}
                isHeaderMicro={false}
              />
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizações recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Transparência popular</h2>
          </div>
          <Badge variant={filteredFeed.length === 0 ? "outline" : "warning"}>{filteredFeed.length} itens</Badge>
        </div>
        <div className="space-y-2">
          {filteredFeed.slice(0, 3).length === 0 ? (
            <EmptyStateCard
              title="Nenhuma atualização recente neste filtro."
              description="Ajuste o combustível, a cidade ou a janela de recência. Se quiser colaborar, envie o primeiro preço."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
              className="text-left"
            />
          ) : (
            filteredFeed.slice(0, 3).map((report: any) => (
              <div key={report.id} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3">
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-white/80">{getStationPublicName(report.station)}</p>
                  <p className="truncate text-[10px] text-white/30">
                    {report.station.neighborhood} · {fuelLabels[report.fuelType as keyof typeof fuelLabels]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                  <p className="text-[10px] text-white/30">{formatRecencyLabel(report.reportedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}









