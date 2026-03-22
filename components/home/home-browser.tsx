"use client";

import { useDeferredValue, useState } from "react";
import { ArrowRight, Camera, Clock3, Search, X } from "lucide-react";
import Link from "next/link";

import { StationMapShell } from "@/components/map/station-map-shell";
import { StationCard } from "@/components/station/station-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import type { ReportWithStation, Station, StationWithReports } from "@/lib/types";

interface HomeBrowserProps {
  stations: StationWithReports[];
  feed: ReportWithStation[];
  recentCount: number;
}

type SearchableStation = Pick<Station, "name" | "brand" | "city" | "neighborhood" | "address">;

function matchesQuery(station: SearchableStation, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [station.name, station.brand, station.city, station.neighborhood, station.address]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalized));
}

export function HomeBrowser({ stations, feed, recentCount }: HomeBrowserProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredStations = stations.filter((station) => matchesQuery(station, deferredQuery));
  const filteredFeed = feed.filter((report) =>
    matchesQuery(
      {
        name: report.station.name,
        brand: report.station.brand,
        city: report.station.city,
        neighborhood: report.station.neighborhood,
        address: ""
      },
      deferredQuery
    )
  );

  return (
    <>
      <SectionCard className="overflow-hidden p-0">
        <div className="border-b border-white/8 px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Badge>Mapa vivo</Badge>
              <h2 className="mt-3 font-display text-[1.75rem] leading-none text-white">
                Preço recente, foto e recência num toque.
              </h2>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/50">
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
          <div className="mt-3 flex items-center justify-between gap-3">
            <ButtonLink href="/sobre" variant="ghost" className="px-0 py-0 text-xs uppercase tracking-[0.18em] text-white/52">
              Ver metodologia
            </ButtonLink>
            <span className="text-xs uppercase tracking-[0.18em] text-white/44">{filteredStations.length} postos</span>
          </div>
        </div>
        <StationMapShell stations={filteredStations} />
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos ativos</p>
          <p className="mt-3 text-3xl font-semibold text-white">{filteredStations.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Últimas 24h</p>
          <p className="mt-3 text-3xl font-semibold text-white">{recentCount}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Com foto</p>
          <p className="mt-3 text-3xl font-semibold text-white">{feed.filter((item) => item.photoUrl).length}</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Agora no mapa</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Consulta rápida</h2>
          </div>
          <Link href="/atualizacoes" className="text-sm text-[color:var(--color-accent)]">
            Ver feed
          </Link>
        </div>
        <div className="space-y-3">
          {filteredStations.length === 0 ? (
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
              Nenhum posto encontrado para essa busca.
            </div>
          ) : (
            filteredStations.map((station) => <StationCard key={station.id} station={station} />)
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizações recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Transparência popular</h2>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {filteredFeed.slice(0, 3).length === 0 ? (
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
              Sem atualização recente para esse filtro.
            </div>
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
                  <Badge variant="warning">{formatRecencyLabel(report.reportedAt)}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/58">
                    <Camera className="h-4 w-4 text-[color:var(--color-accent)]" />
                    Enviado com foto
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
