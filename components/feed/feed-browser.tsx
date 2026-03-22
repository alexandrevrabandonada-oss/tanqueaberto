"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Camera, Clock3, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR, formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters, recencyFilters } from "@/lib/format/labels";
import { filterReports } from "@/lib/filters/public";
import type { FuelFilter, RecencyFilter } from "@/lib/filters/public";
import type { ReportWithStation } from "@/lib/types";

interface FeedBrowserProps {
  feed: ReportWithStation[];
}

export function FeedBrowser({ feed }: FeedBrowserProps) {
  const [query, setQuery] = useState("");
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("all");
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const filteredFeed = useMemo(
    () => filterReports(feed, deferredQuery, fuelFilter, recencyFilter),
    [deferredQuery, feed, fuelFilter, recencyFilter]
  );

  return (
    <>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feed</p>
          <h2 className="text-[1.8rem] font-semibold leading-none text-white">Atualizações recentes</h2>
          <p className="text-sm text-white/58">Linha do tempo com foco em preço, recência e evidência.</p>
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

        <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/62">
          O feed mostra envios aprovados. Para ver postos cadastrados sem preço recente, abra a lista de lacunas do mapa.
          <div className="mt-3">
            <ButtonLink href="/postos/sem-atualizacao" variant="secondary">
              Ver lacunas do mapa
            </ButtonLink>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/44">
          <span>{filteredFeed.length} atualizações</span>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFuelFilter("all");
              setRecencyFilter("all");
            }}
            className="text-white/60 transition hover:text-white"
          >
            Limpar filtros
          </button>
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Linha do tempo</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Entradas mais recentes</h3>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        {filteredFeed.length === 0 ? (
          <EmptyStateCard
            title="Nenhuma atualização recente neste filtro."
            description="Tente outro bairro, cidade, combustível ou recência."
            actionHref="/enviar"
            actionLabel="Enviar primeiro preço"
            className="text-left"
          />
        ) : (
          filteredFeed.map((report) => (
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
      </SectionCard>
    </>
  );
}
