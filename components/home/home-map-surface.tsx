"use client";

import { useEffect, useState } from "react";
import { MapPinned, Sparkles } from "lucide-react";
import type { Route } from "next";

import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StationMapShell } from "@/components/map/station-map-shell";
import type { FuelFilter } from "@/lib/filters/public";
import type { StationWithReports } from "@/lib/types";

interface HomeMapSurfaceProps {
  stations: StationWithReports[];
  contextHref: string;
  fuelFilter: FuelFilter;
  center?: { lat: number; lng: number } | null;
  preferListFirst?: boolean;
}

export function HomeMapSurface({ stations, contextHref, fuelFilter, center, preferListFirst = false }: HomeMapSurfaceProps) {
  const [isMobileNarrow, setIsMobileNarrow] = useState(false);
  const [showMap, setShowMap] = useState(() => !preferListFirst);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileNarrow(media.matches);

    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  const listFirstMode = preferListFirst || isMobileNarrow;
  const primaryListCount = isMobileNarrow ? 4 : 6;

  useEffect(() => {
    setShowMap(!listFirstMode);
  }, [listFirstMode]);

  if (stations.length === 0) {
    return (
      <SectionCard className="space-y-3 overflow-hidden shadow-xl shadow-black/20 xl:p-6">
        <div className="flex items-center gap-3 px-5 xl:px-0">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
            <h3 className="mt-1 text-xl font-semibold text-white xl:text-[1.35rem]">Busca, contexto e postos por perto</h3>
          </div>
        </div>
        <EmptyStateCard
          title={"Nenhum posto disponível no momento."}
          description={"Ajuste a cidade, o combustível ou a recência para trazer um recorte útil de volta."}
          actionHref="/"
          actionLabel="Limpar recorte"
          className="text-left"
        />
      </SectionCard>
    );
  }

  if (listFirstMode && !showMap) {
    return (
      <SectionCard className="space-y-3 overflow-hidden shadow-xl shadow-black/20 xl:p-6">
        <div className="flex items-start justify-between gap-3 px-5 xl:px-0">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa leve</p>
            <h3 className="mt-1 text-xl font-semibold text-white xl:text-[1.35rem]">Lista primeiro. Mapa quando precisar.</h3>
          </div>
          <Badge variant="outline" className="text-[10px]">Modo leve</Badge>
        </div>

        <div className="space-y-2 rounded-[20px] border border-white/8 bg-black/24 p-3 text-sm text-white/56">
          <div className="flex items-center gap-2 text-white">
            <MapPinned className="h-4 w-4 text-[color:var(--color-accent)]" />
            <p className="font-semibold">Os postos mais úteis já estão na lista.</p>
          </div>
          <p>Abra o mapa só quando precisar conferir posição.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={("/postos/sem-atualizacao" as Route)} variant="secondary" className="w-full justify-center sm:flex-1">
              Ver postos na lista
            </ButtonLink>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-black sm:flex-1"
            >
              <Sparkles className="h-4 w-4" />
              Abrir mapa leve
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Postos mais úteis agora</p>
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">{Math.min(primaryListCount, stations.length)} de {stations.length}</span>
          </div>
          <div className="space-y-2">
            {stations.slice(0, primaryListCount).map((station) => (
              <div key={station.id} className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-white">{station.name}</p>
                <p className="truncate text-xs text-white/46">{station.neighborhood || "Bairro"} · {station.city}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="space-y-3 overflow-hidden shadow-xl shadow-black/20 xl:p-6">
      <div className="flex items-start justify-between gap-3 px-5 xl:px-0">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
          <h3 className="mt-1 text-xl font-semibold text-white xl:text-[1.35rem]">Busca, contexto e postos por perto</h3>
        </div>
        {listFirstMode ? <Badge variant="outline" className="text-[10px]">Mapa leve</Badge> : null}
      </div>

      <StationMapShell
        stations={stations}
        className={listFirstMode ? "h-[280px] md:h-[320px] xl:h-[440px]" : "h-[440px] xl:h-[560px]"}
        returnToHref={contextHref}
        fuelFilter={fuelFilter}
        center={center}
        compact={listFirstMode}
      />

      {listFirstMode ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href={("/atualizacoes" as Route)} variant="secondary" className="w-full justify-center sm:flex-1">
            Ver atualizações
          </ButtonLink>
          <button
            type="button"
            onClick={() => setShowMap(false)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/78 sm:flex-1"
          >
            Voltar para a lista
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}


