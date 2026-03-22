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
import { formatDateTimeBR } from "@/lib/format/time";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters, recencyFilters } from "@/lib/format/labels";
import { filterReports, filterStations, getSelectedStationReport, type StationPresenceFilter } from "@/lib/filters/public";
import { canShowStationOnMap, hasPendingStationLocationReview, hasRecentStationPrice } from "@/lib/quality/stations";
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
  const [presenceFilter, setPresenceFilter] = useState<StationPresenceFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const filteredStations = useMemo(
    () => filterStations(stations, deferredQuery, fuelFilter, recencyFilter, presenceFilter),
    [deferredQuery, fuelFilter, presenceFilter, recencyFilter, stations]
  );
  const filteredFeed = useMemo(
    () => filterReports(feed, deferredQuery, fuelFilter, recencyFilter),
    [deferredQuery, feed, fuelFilter, recencyFilter]
  );
  const visibleStations = useMemo(() => filteredStations.filter((station) => canShowStationOnMap(station)), [filteredStations]);
  const stationsWithRecentPrice = useMemo(() => visibleStations.filter((station) => hasRecentStationPrice(station)), [visibleStations]);
  const stationsWithoutRecentPrice = visibleStations.length - stationsWithRecentPrice.length;
  const reviewStations = useMemo(() => filteredStations.filter((station) => hasPendingStationLocationReview(station)), [filteredStations]);
  const noRecentStations = useMemo(() => visibleStations.filter((station) => !hasRecentStationPrice(station)).slice(0, 4), [visibleStations]);

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

  const hasFilters = Boolean(query || fuelFilter !== "all" || recencyFilter !== "all" || presenceFilter !== "all");
  const mapStations = visibleStations;

  return (
    <>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <Badge>Mapa vivo</Badge>
          <h2 className="text-[1.6rem] font-semibold leading-tight text-white">Postos cadastrados no território, com ou sem preço recente.</h2>
          <p className="text-sm text-white/58">Busque, filtre e veja com clareza o que está cadastrado, o que já tem preço recente e onde ainda falta atualização.</p>
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
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[
              { value: "all" as const, label: "Todos os postos" },
              { value: "recent" as const, label: "Só com preço recente" }
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPresenceFilter(item.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                  presenceFilter === item.value
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
                setPresenceFilter("all");
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
              <h3 className="mt-1 text-xl font-semibold text-white">Pins filtrados com legenda clara</h3>
            </div>
            <Link href="/enviar" className="text-sm text-[color:var(--color-accent)]">
              Enviar preço
            </Link>
          </div>
        </div>
        <StationMapShell stations={mapStations} className="h-[440px]" />
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos visíveis</p>
          <p className="mt-3 text-3xl font-semibold text-white">{mapStations.length}</p>
          <p className="mt-1 text-xs text-white/44">Cadastro territorial apto ao mapa</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Com preço recente</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stationsWithRecentPrice.length}</p>
          <p className="mt-1 text-xs text-white/44">Atualização recente aprovada</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sem atualização</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stationsWithoutRecentPrice}</p>
          <p className="mt-1 text-xs text-white/44">Cadastro visível ainda sem preço recente</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizações 24h</p>
          <p className="mt-3 text-3xl font-semibold text-white">{recentCount}</p>
          <p className="mt-1 text-xs text-white/44">Envios aprovados na última janela</p>
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
            title={mapStations.length > 0 ? "Há postos cadastrados, mas ainda sem preço recente neste recorte." : "Nenhum preço disponível para este recorte."}
            description={mapStations.length > 0 ? "Abra a lista dos postos sem atualização e envie a primeira foto onde puder." : "Tente outro bairro, cidade, combustível ou recência."}
            actionHref="/postos/sem-atualizacao"
            actionLabel="Ver postos sem atualização"
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
              <StationCard key={station.id} station={station} fuelFilter={fuelFilter} />
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
          {filteredStations.length === 0 ? (
            <EmptyStateCard
              title="Nenhum posto encontrado para essa busca."
              description="Tente outro bairro, cidade ou combustível."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
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
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
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
                <div className="mt-3 text-xs text-white/46">{formatDateTimeBR(report.reportedAt)}</div>
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
            <p className="mt-1 text-sm text-white/58">Se você passou por algum deles, envie a primeira foto e ajude a preencher o mapa.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">O mapa não fica vazio quando o cadastro existe.</p>
            <p className="mt-1 text-sm text-white/58">A distinção entre cadastro territorial e preço recente deixa a leitura mais honesta.</p>
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






