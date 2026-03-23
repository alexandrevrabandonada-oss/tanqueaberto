"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, Clock3, Search, SlidersHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { StationMapShell } from "@/components/map/station-map-shell";
import { FirstVisitGuide } from "@/components/onboarding/first-visit-guide";
import { StationCard } from "@/components/station/station-card";
import { Badge } from "@/components/ui/badge";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters, recencyFilters } from "@/lib/format/labels";
import { filterReports, filterStations, getSelectedStationReport, hasRecentStationPriceForFilter, type StationPresenceFilter } from "@/lib/filters/public";
import { sortStationsForPublicView }
 from "@/lib/filters/sort";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { persistHomeContext, priorityCities, readHomeContext, readLastStationContext, rememberStationVisit } from "@/lib/navigation/home-context";
import { startRoute, readRouteContext } from "@/lib/navigation/route-context";
import { RouteAssistant } from "@/components/routes/route-assistant";
import { useStreetMode } from "@/hooks/use-street-mode";
import type { FuelFilter, RecencyFilter } from "@/lib/filters/public";
import type { ReportWithStation, StationWithReports } from "@/lib/types";

interface HomeBrowserProps {
  stations: StationWithReports[];
  feed: ReportWithStation[];
  recentCount: number;
  betaClosed?: boolean;
  initialQuery?: string;
  initialCity?: string;
  initialFuelFilter?: FuelFilter;
  initialRecencyFilter?: RecencyFilter;
  initialPresenceFilter?: StationPresenceFilter;
}

function buildContextHref(query: string, city: string, fuelFilter: FuelFilter, recencyFilter: RecencyFilter, presenceFilter: StationPresenceFilter) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (city) params.set("city", city);
  if (fuelFilter !== "all") params.set("fuel", fuelFilter);
  if (recencyFilter !== "all") params.set("recency", recencyFilter);
  if (presenceFilter !== "all") params.set("presence", presenceFilter);
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : "/";
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58">
      <span className="block text-xs uppercase tracking-[0.18em] text-white/42">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[16px] border border-white/8 bg-black/45 px-3 py-3 pr-10 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]"
        >
          {options.map((item) => (
            <option key={item.value} value={item.value} className="bg-zinc-900 text-white">
              {item.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">▾</span>
      </div>
    </label>
  );
}

export function HomeBrowser({
  stations,
  feed,
  recentCount,
  betaClosed = false,
  initialQuery = "",
  initialCity = "",
  initialFuelFilter = "all",
  initialRecencyFilter = "all",
  initialPresenceFilter = "all"
}: HomeBrowserProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>(initialFuelFilter);
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>(initialRecencyFilter);
  const [presenceFilter, setPresenceFilter] = useState<StationPresenceFilter>(initialPresenceFilter);
  const [lastStation, setLastStation] = useState<ReturnType<typeof readLastStationContext>>(() => null);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastTrackedSearchRef = useRef(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const { coords, loading: geoLoading, error: geoError, getLocation } = useGeolocation();
  const { isStreetMode, toggleStreetMode, recentIds, favoriteIds, toggleFavorite, isFavorite } = useStreetMode();

  useEffect(() => {
    void trackProductEvent({ eventType: "home_opened", pagePath: "/", pageTitle: "Mapa vivo", scopeType: "page", scopeId: "/", payload: { streetMode: isStreetMode } });
  }, [isStreetMode]);

  useEffect(() => {
    const storedContext = readHomeContext();
    const storedLastStation = readLastStationContext();

    if (!initialQuery && storedContext.query) {
      setQuery(storedContext.query);
    }

    if (!initialCity && storedContext.city) {
      setSelectedCity(storedContext.city);
    }

    if (initialFuelFilter === "all" && storedContext.fuelFilter && storedContext.fuelFilter !== "all") {
      setFuelFilter(storedContext.fuelFilter);
    }

    if (initialRecencyFilter === "all" && storedContext.recencyFilter && storedContext.recencyFilter !== "all") {
      setRecencyFilter(storedContext.recencyFilter);
    }

    if (initialPresenceFilter === "all" && storedContext.presenceFilter && storedContext.presenceFilter !== "all") {
      setPresenceFilter(storedContext.presenceFilter);
    }

    if (storedLastStation) {
      setLastStation(storedLastStation);
    }

    setIsHydrated(true);
  }, [initialCity, initialFuelFilter, initialPresenceFilter, initialQuery, initialRecencyFilter]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistHomeContext({ query, city: selectedCity, fuelFilter, recencyFilter, presenceFilter });
  }, [fuelFilter, isHydrated, presenceFilter, query, recencyFilter, selectedCity]);

  const cityOptions = useMemo(() => {
    const allCities = Array.from(new Set(stations.map((station) => station.city).filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR"));
    const priority = priorityCities.filter((city) => allCities.some((item) => item.localeCompare(city, "pt-BR") === 0));
    const others = allCities.filter((city) => !priority.some((item) => item.localeCompare(city, "pt-BR") === 0));
    return { priority, others, allCities };
  }, [stations]);

  const stationsWithDistances = useMemo(() => {
    if (!coords) return stations;
    return stations.map(station => ({
      ...station,
      distance: calculateDistance(coords.lat, coords.lng, station.lat, station.lng)
    }));
  }, [stations, coords]);

  const filteredStations = useMemo(
    () => filterStations(stationsWithDistances, deferredQuery, selectedCity, fuelFilter, recencyFilter, presenceFilter),
    [deferredQuery, fuelFilter, presenceFilter, recencyFilter, selectedCity, stationsWithDistances]
  );
  const filteredFeed = useMemo(
    () => filterReports(feed, deferredQuery, selectedCity, fuelFilter, recencyFilter),
    [deferredQuery, feed, fuelFilter, recencyFilter, selectedCity]
  );
  const orderedStations = useMemo(() => {
    let result = [...filteredStations];

    // Sort: Priority 1: Distance (if available), Priority 2: Release Status, Priority 3: Score
    return result.sort((a, b) => {
      // If coordinates are active, proximity is the main driver
      if (coords && a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      const statusOrder: Record<string, number> = { ready: 0, validating: 1, limited: 2, hidden: 3 };
      const orderA = statusOrder[a.releaseStatus ?? "limited"] ?? 99;
      const orderB = statusOrder[b.releaseStatus ?? "limited"] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      
      return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    });
  }, [filteredStations, coords]);
  const visibleStations = useMemo(() => orderedStations.filter((station) => canShowStationOnMap(station)), [orderedStations]);
  const stationsWithRecentPrice = useMemo(
    () => visibleStations.filter((station) => hasRecentStationPriceForFilter(station, fuelFilter)),
    [fuelFilter, visibleStations]
  );
  const stationsWithoutRecentPrice = visibleStations.length - stationsWithRecentPrice.length;
  const reviewStations = useMemo(() => orderedStations.filter((station) => hasPendingStationLocationReview(station)), [orderedStations]);
  const noRecentStations = useMemo(
    () => orderedStations.filter((station) => !hasRecentStationPriceForFilter(station, fuelFilter)).slice(0, 4),
    [fuelFilter, orderedStations]
  );
  const contextHref = useMemo(() => buildContextHref(query, selectedCity, fuelFilter, recencyFilter, presenceFilter), [fuelFilter, presenceFilter, query, recencyFilter, selectedCity]);

  const cheapestNow = useMemo(() => {
    return orderedStations
      .map((station) => {
        const report = getSelectedStationReport(station, fuelFilter);
        return report ? { station, report } : null;
      })
      .filter((item): item is { station: StationWithReports; report: NonNullable<ReturnType<typeof getSelectedStationReport>> } => Boolean(item))
      .sort((left, right) => left.report.price - right.report.price)
      .slice(0, 3);
  }, [fuelFilter, orderedStations]);

  const hasFilters = Boolean(query || selectedCity || fuelFilter !== "all" || recencyFilter !== "all" || presenceFilter !== "all");
  const mapStations = visibleStations;
  const summaryStations = orderedStations.slice(0, 6);

  const resetFilters = () => {
    setQuery("");
    setSelectedCity("");
    setFuelFilter("all");
    setRecencyFilter("all");
    setPresenceFilter("all");
  };

  return (
    <>
      <FirstVisitGuide />
      {betaClosed ? (
        <SectionCard className="space-y-3 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
          <Badge variant="warning">Beta fechado</Badge>
          <h2 className="text-[1.45rem] font-semibold leading-tight text-white">Convite controlado, cobertura em expansão.</h2>
          <p className="text-sm text-white/58">A base real já está no ar. Se algo estiver confuso, use o feedback. Se faltar posto ou preço, use as lacunas do mapa.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/feedback" className="inline-flex">
              Enviar feedback
            </ButtonLink>
            <ButtonLink href="/postos/sem-atualizacao" variant="secondary" className="inline-flex">
              Ver lacunas do mapa
            </ButtonLink>
          </div>
        </SectionCard>
      ) : null}

      <div className="mb-4">
        <RouteAssistant stations={stations} />
      </div>

      <div className="mb-4">
        <Button 
          variant={isStreetMode ? "primary" : "secondary"}
          onClick={toggleStreetMode}
          className="w-full h-14 rounded-[22px] text-xs font-bold uppercase tracking-widest shadow-lg border-2 border-white/5"
        >
          {isStreetMode ? "MODO RUA ATIVO" : "🚀 MODO RUA (MAIS RÁPIDO)"}
        </Button>
      </div>

      {(recentIds.length > 0 || favoriteIds.length > 0) && (
        <SectionCard className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Acesso Rápido</p>
            <Badge variant="outline" className="text-[9px]">Polegar amigável</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {favoriteIds.map(fid => {
              const s = stations.find(st => st.id === fid);
              if (!s) return null;
              return (
                <Link 
                  key={`fav-${fid}`}
                  href={`/enviar?stationId=${fid}#photo`}
                  className="flex min-w-[150px] flex-col rounded-[22px] border border-yellow-400/30 bg-yellow-400/5 p-4 transition active:scale-95 hover:bg-yellow-400/10"
                >
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mb-2" />
                  <p className="text-sm font-bold text-white truncate">{getStationPublicName(s)}</p>
                  <p className="text-xs text-white/40 truncate">{s.neighborhood}</p>
                </Link>
              );
            })}
            {recentIds.filter(rid => !favoriteIds.includes(rid)).map(rid => {
              const s = stations.find(st => st.id === rid);
              if (!s) return null;
              return (
                <Link 
                  key={`rec-${rid}`}
                  href={`/enviar?stationId=${rid}#photo`}
                  className="flex min-w-[150px] flex-col rounded-[22px] border border-white/10 bg-white/5 p-4 transition active:scale-95 hover:bg-white/10"
                >
                  <Clock3 className="h-4 w-4 text-white/40 mb-2" />
                  <p className="text-sm font-bold text-white truncate">{getStationPublicName(s)}</p>
                  <p className="text-xs text-white/40 truncate">{s.neighborhood}</p>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard className={cn("space-y-4", isStreetMode && "space-y-2 py-3")}>
        {!isStreetMode && (
          <div className="space-y-1.5">
            <Badge className="text-[10px] uppercase tracking-widest">Mapa Vivo</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-white">Transparência territorial e preço real</h2>
            <p className="text-sm leading-relaxed text-white/40">Busque, filtre e colabore para manter o mapa vivo.</p>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/50">
          <Search className="h-4 w-4 text-[color:var(--color-accent)]" />
          <input
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              if (nextValue.length >= 2 && nextValue !== lastTrackedSearchRef.current) {
                lastTrackedSearchRef.current = nextValue;
                void trackProductEvent({
                  eventType: "home_search_used",
                  pagePath: "/",
                  pageTitle: "Mapa vivo",
                  scopeType: "page",
                  scopeId: "/",
                  payload: { queryLength: nextValue.length, query: nextValue }
                });
              }
            }}
            placeholder="Buscar posto, bairro ou cidade"
            className="w-full bg-transparent outline-none placeholder:text-white/38"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="text-white/50 transition hover:text-white">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex h-10 w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Button 
              variant={coords ? "primary" : "secondary"}
              onClick={() => getLocation()}
              disabled={geoLoading}
              className="h-8 shrink-0 py-0 px-3 text-[10px] font-bold uppercase tracking-widest"
            >
              {geoLoading ? "Buscando..." : coords ? "GPS Ativo" : "📍 Perto de mim"}
            </Button>
            <div className="h-4 w-px shrink-0 bg-white/10" />
            <button
              type="button"
              onClick={() => setSelectedCity("")}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                selectedCity === "" ? "bg-[color:var(--color-accent)] text-black" : "border border-white/10 bg-white/5 text-white/66"
              }`}
            >
              Todas as cidades
            </button>
            {cityOptions.priority.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                  selectedCity.localeCompare(city, "pt-BR") === 0 ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white/66"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-white/44">Comece por Volta Redonda, Barra Mansa ou Barra do Piraí. O recorte preferido fica salvo para a próxima visita.</p>

          <div className="grid gap-3 md:grid-cols-3">
            <FilterSelect
              label="Combustível"
              value={fuelFilter}
              onChange={(value) => setFuelFilter(value as FuelFilter)}
              options={publicFuelFilters.map((item) => ({ value: item.value, label: item.label }))}
            />
            <FilterSelect
              label="Recência"
              value={recencyFilter}
              onChange={(value) => setRecencyFilter(value as RecencyFilter)}
              options={recencyFilters.map((item) => ({ value: item.value, label: item.label }))}
            />
            <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58">
              <span className="block text-xs uppercase tracking-[0.18em] text-white/42">Exibição</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "all" as const, label: "Todos os postos" },
                  { value: "recent" as const, label: "Só com preço recente" }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPresenceFilter(item.value)}
                    className={`rounded-[16px] px-3 py-3 text-xs font-semibold transition ${
                      presenceFilter === item.value ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white/66"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <details className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/58">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-white/76">
              <span className="inline-flex items-center gap-2 font-medium">
                <SlidersHorizontal className="h-4 w-4 text-[color:var(--color-accent)]" />
                Mais filtros
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-white/42">Avançado</span>
            </summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Combustíveis rápidos</p>
                <div className="flex flex-wrap gap-2">
                  {publicFuelFilters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFuelFilter(item.value)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                        fuelFilter === item.value ? "bg-[color:var(--color-accent)] text-black" : "border border-white/10 bg-white/5 text-white/66"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {cityOptions.others.length > 0 ? (
                <label className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58">
                  <span className="block text-xs uppercase tracking-[0.18em] text-white/42">Outras cidades</span>
                  <div className="relative">
                    <select
                      value={selectedCity && !priorityCities.some((city) => city.localeCompare(selectedCity, "pt-BR") === 0) ? selectedCity : ""}
                      onChange={(event) => setSelectedCity(event.target.value)}
                      className="w-full appearance-none rounded-[16px] border border-white/8 bg-black/45 px-3 py-3 pr-10 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]"
                    >
                      <option value="" className="bg-zinc-900 text-white">Selecionar cidade</option>
                      {cityOptions.others.map((city) => (
                        <option key={city} value={city} className="bg-zinc-900 text-white">
                          {city}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">▾</span>
                  </div>
                </label>
              ) : null}

              <p className="text-xs leading-relaxed text-white/46">Os filtros avançados continuam disponíveis, mas ficam abaixo da decisão inicial para reduzir ruído na primeira leitura.</p>
            </div>
          </details>
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/44">
          <div className="flex items-center gap-3">
            <span>{orderedStations.length} postos no recorte</span>
            {selectedCity && !readRouteContext().active && (
              <button 
                type="button" 
                onClick={() => {
                  startRoute(selectedCity, null, fuelFilter);
                  window.location.reload(); // Refresh to show assistant
                }}
                className="font-bold text-[color:var(--color-accent)] hover:underline"
              >
                · Iniciar Rota de Coleta
              </button>
            )}
          </div>
          {hasFilters ? (
            <button type="button" onClick={resetFilters} className="text-white/60 transition hover:text-white">
              Limpar filtros
            </button>
          ) : null}
        </div>
      </SectionCard>

      {lastStation ? (
        <SectionCard className="flex items-center justify-between gap-3 border-white/8 bg-white/5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Retomar contexto</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Último posto visto: {lastStation.name}</h3>
            <p className="text-sm text-white/54">{lastStation.city}</p>
          </div>
          <ButtonLink href={(`/postos/${lastStation.id}?returnTo=${encodeURIComponent(contextHref)}` as Route)} variant="secondary">
            Abrir novamente
          </ButtonLink>
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-3 overflow-hidden p-0">
        <div className="border-b border-white/8 px-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Pins filtrados com leitura por cidade</h3>
            </div>
            <Link href="/enviar" className="text-sm text-[color:var(--color-accent)]">
              Enviar preço
            </Link>
          </div>
        </div>
        <StationMapShell stations={mapStations} className="h-[440px]" returnToHref={contextHref} fuelFilter={fuelFilter} center={coords} />
      </SectionCard>

      {summaryStations.length > 0 ? (
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Lista do recorte</p>
              <div className="flex items-center gap-2">
                <h2 className="mt-1 text-lg font-semibold text-white">Postos no seu filtro atual</h2>
                {selectedCity && orderedStations.length > 0 && orderedStations[0].releaseStatus && (
                  <GroupStatusBadge status={orderedStations[0].releaseStatus} className="mt-1" />
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{summaryStations.length} no mapa</Badge>
          </div>
          <div className="space-y-1.5">
            {summaryStations.map((station) => {
              const latest = getSelectedStationReport(station, fuelFilter);
              const stationHref = `/postos/${station.id}?returnTo=${encodeURIComponent(contextHref)}` as Route;
              return (
                <Link
                  key={station.id}
                  href={stationHref}
                  onClick={() => {
                    rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                    void trackProductEvent({ eventType: "station_clicked", pagePath: contextHref, pageTitle: "Mapa vivo", stationId: station.id, city: station.city, fuelType: latest?.fuelType ?? null, scopeType: "station", scopeId: station.id, payload: { source: "recorte-lista" } });
                  }}
                  className="group flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3 transition hover:border-white/12 hover:bg-white/8 active:scale-[0.99]"
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-[color:var(--color-accent)]">{getStationPublicName(station)}</p>
                    <p className="truncate text-xs text-white/40">
                      {station.neighborhood}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {station.distance !== undefined && (
                      <span className="text-[10px] font-medium text-white/40">
                        {formatDistance(station.distance)}
                      </span>
                    )}
                    {latest ? (
                      <Badge variant={recencyToneToBadgeVariant(getRecencyTone(latest.reportedAt))} className="text-[10px]">
                        {formatRecencyLabel(latest.reportedAt)}
                      </Badge>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-white/24">Sem preço</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {[
          { label: "No Recorte", value: mapStations.length, note: "Postos visíveis" },
          { label: "Com Preço", value: stationsWithRecentPrice.length, note: "Recentemente" },
          { label: "Falta Atualizar", value: stationsWithoutRecentPrice, note: "Sem preço recente", tone: "warning" },
          { label: "No Ar 24h", value: recentCount, note: "Últimos envios", tone: "accent" }
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col rounded-[18px] border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tighter ${stat.tone === 'accent' ? 'text-[color:var(--color-accent)]' : stat.tone === 'warning' ? 'text-orange-400' : 'text-white'}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-white/20">{stat.note}</p>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mais baratos agora</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Leitura rápida do filtro atual</h2>
          </div>
          <Badge variant="warning">{fuelFilter === "all" ? "Todos os combustíveis" : fuelLabels[fuelFilter]}</Badge>
        </div>
        {cheapestNow.length === 0 ? (
          <EmptyStateCard
            title={mapStations.length > 0 ? "Há postos cadastrados, mas ainda sem preço recente neste recorte." : "Nenhum preço disponível para este recorte."}
            description={mapStations.length > 0 ? "Abra a lista dos postos sem atualização e envie a primeira foto onde puder." : "Tente outro bairro, cidade, combustível ou remova os filtros para voltar ao mapa completo."}
            actionHref="/postos/sem-atualizacao"
            actionLabel="Ver postos sem atualização"
            className="text-left"
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {cheapestNow.map(({ station, report }) => (
              <div key={report.id} className="rounded-[18px] border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 truncate">{getStationPublicName(station)}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
                  <span className="truncate">{fuelLabels[report.fuelType]}</span>
                  <span className="shrink-0">{formatRecencyLabel(report.reportedAt)}</span>
                </div>
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
            {noRecentStations.map((station) => (
              <StationCard 
                key={station.id} 
                station={station} 
                fuelFilter={fuelFilter} 
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
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
            orderedStations.map((station) => (
              <StationCard 
                key={station.id} 
                station={station} 
                fuelFilter={fuelFilter} 
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
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
            filteredFeed.slice(0, 3).map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3">
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-white/80">{getStationPublicName(report.station)}</p>
                  <p className="truncate text-[10px] text-white/30">
                    {report.station.neighborhood} · {fuelLabels[report.fuelType]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <p className="text-lg font-bold text-white">{formatCurrencyBRL(report.price)}</p>
                  <p className="text-[10px] text-white/20">{formatRecencyLabel(report.reportedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Colaboração</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Ajudar a base a ficar viva</h2>
          </div>
          <Link href="/postos/sem-atualizacao" className="text-sm text-[color:var(--color-accent)]">
            Ver lacunas do mapa
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">Há postos cadastrados sem preço recente ({reviewStations.length} em revisão territorial).</p>
            <p className="mt-1 text-sm text-white/58">Se você passou por algum deles, envie a primeira foto. Isso transforma lacuna em dado útil.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">O mapa não fica vazio quando o cadastro existe.</p>
            <p className="mt-1 text-sm text-white/58">Cadastro territorial e preço recente são coisas diferentes. O app mostra isso sem confundir o usuário.</p>
          </div>
        </div>
        <ButtonLink href="/enviar" className="w-full">
          Enviar preço para o mapa
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </SectionCard>
    </>
  );
}
