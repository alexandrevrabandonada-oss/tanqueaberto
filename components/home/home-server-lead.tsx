"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { startTransition, useMemo } from "react";
import { MapPinned, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { useLocationHardening } from "@/hooks/use-location-hardening";
import { filterStations, getSelectedStationReport } from "@/lib/filters/public";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { fuelLabels } from "@/lib/format/labels";
import { calculateDistance, formatDistanceFromYou } from "@/lib/geo/distance";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { getStationPublicName } from "@/lib/quality/stations";
import { cn } from "@/lib/utils";
import type { FuelFilter, RecencyFilter, StationPresenceFilter } from "@/lib/filters/public";
import type { StationWithReports } from "@/lib/types";

interface HomeServerLeadProps {
  stations: StationWithReports[];
  recentCount: number;
  initialCity: string;
  initialQuery: string;
  initialFuelFilter: FuelFilter;
  initialRecencyFilter: RecencyFilter;
  initialPresenceFilter: StationPresenceFilter;
}

function buildContextHref(
  query: string,
  city: string,
  fuelFilter: FuelFilter,
  recencyFilter: RecencyFilter,
  presenceFilter: StationPresenceFilter
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (city) params.set("city", city);
  if (fuelFilter !== "all") params.set("fuel", fuelFilter);
  if (recencyFilter !== "all") params.set("recency", recencyFilter);
  if (presenceFilter !== "all") params.set("presence", presenceFilter);
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : "/";
}

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` as Route) : (`/postos/${stationId}` as Route);
}

export function HomeServerLead({
  stations,
  recentCount,
  initialCity,
  initialQuery,
  initialFuelFilter,
  initialRecencyFilter,
  initialPresenceFilter
}: HomeServerLeadProps) {
  const router = useRouter();
  const { location } = useLocationHardening();
  const coords = useMemo(
    () => (location ? { lat: location.lat, lng: location.lng } : null),
    [location]
  );
  const contextHref = useMemo(
    () => buildContextHref(initialQuery, initialCity, initialFuelFilter, initialRecencyFilter, initialPresenceFilter),
    [initialCity, initialFuelFilter, initialPresenceFilter, initialQuery, initialRecencyFilter]
  );

  const nearbyStations = useMemo(() => {
    const baseStations = filterStations(
      stations,
      initialQuery,
      initialCity,
      initialFuelFilter,
      initialRecencyFilter,
      initialPresenceFilter
    );

    if (!coords) {
      return baseStations.slice(0, 6);
    }

    return [...baseStations]
      .map((station) => ({
        station,
        distance:
          station.lat !== null && station.lng !== null
            ? calculateDistance(coords.lat, coords.lng, station.lat, station.lng)
            : Number.POSITIVE_INFINITY
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 6)
      .map(({ station }) => station);
  }, [coords, initialCity, initialFuelFilter, initialPresenceFilter, initialQuery, initialRecencyFilter, stations]);

  const selectedModeLabel =
    initialFuelFilter !== "all"
      ? `Combustível: ${initialFuelFilter}`
      : initialRecencyFilter !== "all"
        ? `Recência: ${initialRecencyFilter}`
        : initialPresenceFilter === "recent"
          ? "Só preço recente"
          : initialCity
            ? initialCity
            : "Busca livre";

  return (
    <SectionCard className="mb-3 space-y-3 border-white/10 bg-white/5 shadow-lg shadow-black/12 md:hidden">
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">Leitura rápida</p>
        <h1 className="text-[1.32rem] font-semibold leading-tight text-white">Ache um posto. Envie o preço.</h1>
        <p className="text-sm leading-relaxed text-white/56">Busca, proximidade e lista útil primeiro.</p>
      </div>

      <form action="/" method="get" className="space-y-2 rounded-[20px] border border-white/8 bg-black/24 p-3">
        <label className="space-y-2 text-sm text-white/58">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/42">
            <Search className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
            Buscar posto, bairro ou cidade
          </span>
          <input
            name="q"
            defaultValue={initialQuery}
            placeholder="Digite o nome ou bairro"
            className="w-full rounded-[16px] border border-white/8 bg-black/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
          />
        </label>
        <input type="hidden" name="city" value={initialCity} />
        <input type="hidden" name="fuel" value={initialFuelFilter} />
        <input type="hidden" name="recency" value={initialRecencyFilter} />
        <input type="hidden" name="presence" value={initialPresenceFilter} />
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" className="flex-1 justify-center">
            Buscar
          </Button>
          <ButtonLink href="/enviar" className="flex-1 justify-center">
            Enviar preço
          </ButtonLink>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="text-[10px]">{selectedModeLabel}</Badge>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/34">{recentCount} envios recentes</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {initialCity ? (
          <Badge variant="accent" className="text-[10px]">
            <MapPinned className="mr-1 h-3 w-3" />
            {initialCity}
          </Badge>
        ) : null}
        <Badge variant="secondary" className="text-[10px]">Mapa quando precisar</Badge>
        <Badge variant="secondary" className="text-[10px]">Lista primeiro</Badge>
        <Badge variant="secondary" className="text-[10px]">Preços recentes</Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Postos úteis agora</p>
          <ButtonLink href={"/#mapa-ao-vivo" as Route} variant="ghost" className="h-auto px-0 py-0 text-[10px] uppercase tracking-[0.18em] text-white/42">
            Abrir mapa
          </ButtonLink>
        </div>
        <div className="space-y-2">
          {nearbyStations.map((station) => {
            const latest = getSelectedStationReport(station, initialFuelFilter);
            const distance = coords && station.lat !== null && station.lng !== null
              ? calculateDistance(coords.lat, coords.lng, station.lat, station.lng)
              : null;

            return (
              <button
                key={station.id}
                type="button"
                onClick={() => {
                  rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                  startTransition(() => {
                    router.push(getStationHref(station.id, contextHref));
                  });
                }}
                className={cn("block w-full rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-white/12 hover:bg-white/8")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{getStationPublicName(station)}</p>
                    <p className="truncate text-xs text-white/44">
                      {station.neighborhood || "Bairro"}{station.city ? ` · ${station.city}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/34">
                      {station.brand || "Sem bandeira"} · {latest ? `${fuelLabels[latest.fuelType]} · ${formatCurrencyBRL(latest.price)} · ${formatRecencyLabel(latest.reportedAt)}` : "Sem preço recente"}
                    </p>
                  </div>
                  <div className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
                    <Sparkles className="h-4 w-4 text-[color:var(--color-accent)]/70" />
                    {distance !== null ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]/78">
                        {formatDistanceFromYou(distance)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
          {nearbyStations.length === 0 ? (
            <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-white/56">
              Ajuste a busca para trazer postos mais próximos ou recentes.
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}


