"use client";

import { useEffect, useState, useMemo } from "react";
import { Camera, Forward, MapPin, XCircle, Flag } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { readRouteContext, stopRoute, skipStationInRoute, type RouteContext } from "@/lib/navigation/route-context";
import { getNextPriorityStation } from "@/lib/ops/route-priority";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatDistance } from "@/lib/geo/distance";
import { trackProductEvent } from "@/lib/telemetry/client";
import { getStationPublicName } from "@/lib/quality/stations";
import type { StationWithReports } from "@/lib/types";

// Note: Consistent naming.

interface RouteAssistantProps {
  stations: StationWithReports[];
  currentStationId?: string | null;
}

export function RouteAssistant({ stations, currentStationId = null }: RouteAssistantProps) {
  const [context, setContext] = useState<RouteContext | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setContext(readRouteContext());
  }, []);

  const { coords, getLocation } = useGeolocation();

  const nextStation = useMemo(() => {
    if (!context || !context.active) return null;
    return getNextPriorityStation(stations, context, currentStationId, coords);
  }, [context, stations, currentStationId, coords]);

  if (!isMounted || !context || !context.active) {
    return null;
  }

  const handleSkip = () => {
    if (!nextStation) return;
    
    skipStationInRoute(nextStation.id);
    const updated = readRouteContext();
    setContext(updated);
    
    void trackProductEvent({
      eventType: "route_station_skipped",
      pagePath: window.location.pathname,
      pageTitle: document.title,
      stationId: nextStation.id,
      scopeType: "route",
      scopeId: context.startedAt || "active",
      payload: { 
        city: nextStation.city,
        skippedCount: updated.skippedStationIds.length
      }
    });
  };

  const handleStop = () => {
    if (window.confirm("Deseja encerrar a rota de coleta atual?")) {
      stopRoute();
      setContext(readRouteContext());
      void trackProductEvent({
        eventType: "route_abandoned",
        pagePath: window.location.pathname,
        pageTitle: document.title,
        scopeType: "route",
        scopeId: context.startedAt || "active"
      });
    }
  };

  if (!nextStation) {
    return (
      <SectionCard className="border-white/10 bg-[color:var(--color-accent)]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-[color:var(--color-accent)]" />
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Rota Concluída</p>
              <h3 className="text-lg font-bold text-white">Não há mais postos prioritários no recorte.</h3>
            </div>
          </div>
          <Button variant="ghost" onClick={handleStop}>Finalizar</Button>
        </div>
      </SectionCard>
    );
  }

  const sendHref = `/enviar?stationId=${nextStation.id}&returnTo=${encodeURIComponent(window.location.pathname)}#photo` as Route;

  return (
    <SectionCard className="border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="animate-pulse">PRÓXIMO ALVO</Badge>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Assistente de Rota</p>
        </div>
        <button onClick={handleStop} className="text-white/20 hover:text-white/60">
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold tracking-tight text-white">{getStationPublicName(nextStation)}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/50">
            <MapPin className="h-3.5 w-3.5 text-[color:var(--color-accent)]/60" />
            {nextStation.neighborhood}, {nextStation.city}
            {nextStation.distance !== undefined && (
              <span className="flex items-center gap-1 text-[color:var(--color-accent)]">
                <span className="h-1 w-1 rounded-full bg-white/20" />
                {formatDistance(nextStation.distance)}
              </span>
            )}
          </p>
          <div className="mt-3 flex gap-4 text-[11px] text-white/30">
            <span>{nextStation.latestReports.length || 0} reports recentes</span>
            <span>Sem preço para {context.fuelFilter === "all" ? "Gasolina" : context.fuelFilter}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link 
          href={sendHref}
          onClick={() => {
            void trackProductEvent({
              eventType: "route_station_arrived",
              pagePath: window.location.pathname,
              pageTitle: document.title,
              stationId: nextStation.id,
              scopeType: "route",
              scopeId: context.startedAt || "active"
            });
          }}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-6 text-sm font-bold text-black transition hover:opacity-90 active:scale-[0.98]"
        >
          <Camera className="h-5 w-5" />
          Abrir Câmera
        </Link>
        <Button 
          variant="secondary" 
          className="h-12 w-12 rounded-full p-0"
          onClick={handleSkip}
          title="Pular este posto"
        >
          <Forward className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-white/20">
        <span>Progresso: {context.completedStationIds.length} concluídos · {context.skippedStationIds.length} pulados</span>
        <span className="uppercase tracking-widest">Coleta Assistida</span>
      </div>
    </SectionCard>
  );
}
