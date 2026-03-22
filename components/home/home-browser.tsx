"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, Camera, Clock3, Search, X } from "lucide-react";
import Link from "next/link";

import { StationMapShell } from "@/components/map/station-map-shell";
import { StationCard } from "@/components/station/station-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters, recencyFilters } from "@/lib/format/labels";
import { filterReports, filterStations, getSelectedStationReport } from "@/lib/filters/public";
import type { FuelFilter, RecencyFilter } from "@/lib/filters/public";
import type { ReportWithStation, StationWithReports } from "@/lib/types";

interface HomeBrowserProps {
  stations: StationWithReports[];
  feed: ReportWithStation[];
  recentCount: number;
}

export function HomeBrowser({ stations, feed, recentCount }: HomeBrowserProps) {
  const [query, setQuery] = useState("");
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("all");
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const filteredStations = useMemo(
    () => filterStations(stations, deferredQuery, fuelFilter, recencyFilter),
    [deferredQuery, fuelFilter, recencyFilter, stations]
  );
  const filteredFeed = useMemo(
    () => filterReports(feed, deferredQuery, fuelFilter, recencyFilter),
    [deferredQuery, feed, fuelFilter, recencyFilter]
  );
  const cheapestNow = useMemo(() => {
    return filteredStations
      .map((station) => {
        const report = getSelectedStationReport(station, fuelFilter);
        return report ? { station, report } : null;
      })
      .filter((item): item is { station: StationWithReports; report: NonNullable<ReturnType<typeof getSelectedStationReport>> } => Boolean(item))
      .sort((left, right) => left.report.price - right.report.price)
      .slice(0, 3);
  }, [filteredStations, fuelFilter]);

  const hasFilters = Boolean(query || fuelFilter !== "all" || recencyFilter !== "all");

  return (
    <>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <Badge>Mapa vivo</Badge>
          <h2 className="text-[1.6rem] font-semibold leading-tight text-white">Onde tem preço hoje, sem perder tempo.</h2>
          <p className="text-sm text-white/58">Busque, filtre e vá direto ao posto certo.</p>
        </div>

        <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/50">
          <Search className="h-4 w-4 text-[color:var(--color-accent)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {publicFuelFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFuelFilter(item.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                  fuelFilter === item.value
                    ? "bg-[color:var(--color-accent)] text-black"
                    : "border border-white/10 bg-white/5 text-white/66"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {recencyFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRecencyFilter(item.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                  recencyFilter === item.value
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white/66"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/44">
          <span>{filteredStations.length} postos no filtro</span>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFuelFilter("all");
                setRecencyFilter("all");
              }}
              className="text-white/60 transition hover:text-white"
            >
              Limpar busca
            </button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard className="space-y-3 overflow-hidden p-0">
        <div className="border-b border-white/8 px-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Pins filtrados em tempo real</h3>
            </div>
            <Link href="/enviar" className="text-sm text-[color:var(--color-accent)]">
              Enviar preço
            </Link>
          </div>
        </div>
        <StationMapShell stations={filteredStations} className="h-[440px]" />
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos visíveis</p>
          <p className="mt-3 text-3xl font-semibold text-white">{filteredStations.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizações 24h</p>
          <p className="mt-3 text-3xl font-semibold text-white">{recentCount}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Com foto</p>
          <p className="mt-3 text-3xl font-semibold text-white">{filteredFeed.filter((item) => item.photoUrl).length}</p>
        </div>
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
            title="Nenhum preço disponível para este recorte."
            description="Tente outro bairro, cidade, combustível ou recência."
            actionHref="/enviar"
            actionLabel="Enviar o primeiro preço desta área"
            className="text-left"
          />
        ) : (
          <div className="space-y-3">
            {cheapestNow.map(({ station, report }) => (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{station.name}</p>
                    <p className="text-sm text-white/50">
                      {station.neighborhood}, {station.city}
                    </p>
                  </div>
                  <Badge variant={recencyToneToBadgeVariant(getRecencyTone(report.reportedAt))}>{formatRecencyLabel(report.reportedAt)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-white/58">{fuelLabels[report.fuelType]}</div>
                  <div className="text-2xl font-semibold text-white">{formatCurrencyBRL(report.price)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Agora no mapa</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Consulta rápida</h2>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {filteredStations.length === 0 ? (
            <EmptyStateCard
              title="Nenhum posto encontrado para essa busca."
              description="Tente outro bairro, cidade ou combustível."
              actionHref="/enviar"
              actionLabel="Enviar o primeiro preço desta área"
              className="text-left"
            />
          ) : (
            filteredStations.map((station) => <StationCard key={station.id} station={station} fuelFilter={fuelFilter} />)
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
        <div className="space-y-3">
          {filteredFeed.slice(0, 3).length === 0 ? (
            <EmptyStateCard
              title="Nenhuma atualização recente neste filtro."
              description="Ajuste o combustível, a cidade ou a janela de recência para ver novos registros."
              actionHref="/enviar"
              actionLabel="Enviar novo preço"
              className="text-left"
            />
          ) : (
            filteredFeed.slice(0, 3).map((report) => (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{report.station.name}</p>
                    <p className="text-sm text-white/50">
                      {report.station.neighborhood}, {report.station.city}
                    </p>
                  </div>
                  <Badge variant={recencyToneToBadgeVariant(getRecencyTone(report.reportedAt))}>{formatRecencyLabel(report.reportedAt)}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/58">
                    <Camera className="h-4 w-4 text-[color:var(--color-accent)]" />
                    {fuelLabels[report.fuelType]}
                  </div>
                  <p className="text-xl font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <ButtonLink href="/enviar" className="px-5 py-3">
          Enviar novo preço
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </SectionCard>
    </>
  );
}
