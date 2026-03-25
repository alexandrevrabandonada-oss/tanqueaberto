"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, ArrowRight, MapPin, Trophy, LayoutDashboard, Inbox, History, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStationPublicName } from "@/lib/quality/stations";
import type { StationWithReports, FuelType } from "@/lib/types";
import { trackProductEvent } from "@/lib/telemetry/client";

interface PostSubmissionBridgeProps {
  status: 'success' | 'queued' | 'needs_adjustment';
  station: StationWithReports;
  fuelType: FuelType;
  price: string;
  isStreetMode?: boolean;
  mission?: any;
  nextMissionStation?: StationWithReports | null;
  nearbyStations?: StationWithReports[];
  safeReturnToHref?: string | null;
  onReset: () => void;
}

export function PostSubmissionBridge({
  status,
  station,
  fuelType,
  price,
  isStreetMode,
  mission,
  nextMissionStation,
  nearbyStations = [],
  safeReturnToHref,
  onReset
}: PostSubmissionBridgeProps) {
  const router = useRouter();
  
  // Encontrar o próximo posto mais próximo sem preço recente
  const recommendedStation = nearbyStations
    .filter(s => s.id !== station.id)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0))[0];

  const handleAction = (action: string, href: Route | string, payload?: any) => {
    void trackProductEvent({
      eventType: "post_submission_continuation" as any,
      pagePath: "/enviar",
      pageTitle: "Pós-envio",
      stationId: station.id,
      fuelType,
      payload: { action, ...payload }
    });
    router.push(href as Route);
  };

  return (
    <div className={cn("space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500")}>
      {/* Header de Status */}
      <div className={cn(
        "rounded-[28px] border p-6 text-center shadow-2xl",
        status === 'success' ? "border-green-400/20 bg-green-400/10" : 
        status === 'queued' ? "border-yellow-400/20 bg-yellow-400/10" : 
        "border-red-400/20 bg-red-400/10"
      )}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/40 shadow-inner">
          {status === 'success' ? (
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          ) : status === 'queued' ? (
            <Clock3 className="h-10 w-10 text-yellow-400" />
          ) : (
            <History className="h-10 w-10 text-red-400" />
          )}
        </div>
        
        <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
          {status === 'success' ? "DADOS NO AR!" : 
           status === 'queued' ? "NA FILA LOCAL" : 
           "AJUSTE NECESSÁRIO"}
        </h2>
        <p className="mt-2 text-white/70">
          {status === 'success' ? `O preço de ${getStationPublicName(station)} foi atualizado.` : 
           status === 'queued' ? "Sem internet agora? Relaxa, guardamos o envio para subir assim que você conectar." : 
           "Houve um problema no envio. Verifique na sua inbox."}
        </p>
      </div>

      {/* Próximos Passos Sugeridos */}
      <div className="space-y-3">
        <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">O que fazer agora?</p>
        
        {/* OPÇÃO 1: Missão Ativa (Prioridade Máxima) */}
        {nextMissionStation && (
          <Button
            onClick={() => handleAction("next_mission", `/enviar?stationId=${nextMissionStation.id}#photo`, { missionId: mission?.id })}
            className="group relative h-20 w-full overflow-hidden rounded-[24px] bg-yellow-400 p-0 text-black shadow-[0_10px_40px_rgba(255,212,0,0.2)] hover:scale-[1.02] transition-all"
          >
            <div className="flex w-full items-center justify-between px-6">
              <div className="text-left">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-60">
                  <Trophy className="h-3 w-3" /> MISSÃO ATIVA
                </span>
                <p className="text-lg font-black italic uppercase tracking-tight leading-none mt-1">
                  PRÓXIMO ALVO: {getStationPublicName(nextMissionStation)}
                </p>
              </div>
              <ArrowRight className="h-8 w-8 transition-transform group-hover:translate-x-2" />
            </div>
            {/* Indicador de progresso sutil */}
            <div className="absolute bottom-0 left-0 h-1 bg-black/10 transition-all" style={{ width: `${((mission?.currentIndex + 1) / mission?.stationIds.length) * 100}%` }} />
          </Button>
        )}

        {/* OPÇÃO 2: Posto Vizinho (Se não houver missão ou o próximo alvo estiver longe) */}
        {!nextMissionStation && recommendedStation && (
          <Button
            onClick={() => handleAction("nearby_station", `/enviar?stationId=${recommendedStation.id}#photo`)}
            variant="secondary"
            className="h-18 w-full rounded-[24px] border border-white/10 bg-white/5 py-4 text-white hover:bg-white/10"
          >
            <div className="flex w-full items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">Posto próximo sem preço</p>
                  <p className="text-xs text-white/50">{getStationPublicName(recommendedStation)} • {Math.round(recommendedStation.distance || 0)}m</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5" />
            </div>
          </Button>
        )}

        {/* OPÇÃO 3: Outro Combustível (Mesmo Posto) */}
        <Button
          variant="secondary"
          onClick={() => {
            onReset();
            void trackProductEvent({
              eventType: "post_submission_continuation" as any,
              pagePath: "/enviar",
              pageTitle: "Pós-envio",
              stationId: station.id,
              payload: { action: "same_station" }
            });
          }}
          className="h-18 w-full rounded-[24px] border-white/5 bg-black/20 text-white/70 hover:bg-black/40"
        >
          <div className="flex items-center gap-3">
             <CheckCircle2 className="h-5 w-5 text-white/30" />
             <span>Enviar outro combustível neste posto</span>
          </div>
        </Button>

        {/* Navegação Secundária */}
        <div className="grid grid-cols-2 gap-3 pt-2">
           <Button
             variant="ghost"
             onClick={() => handleAction("return_map", safeReturnToHref ?? "/")}
             className="h-14 rounded-[20px] bg-white/5 text-[11px] font-black uppercase tracking-widest text-white/50"
           >
             <MapPin className="mr-2 h-4 w-4" />
             Mapa
           </Button>
           <Button
             variant="ghost"
             onClick={() => handleAction("go_hub", "/hub")}
             className="h-14 rounded-[20px] bg-white/5 text-[11px] font-black uppercase tracking-widest text-[color:var(--color-accent)]"
           >
             <LayoutDashboard className="mr-2 h-4 w-4" />
             Meu Hub
           </Button>
        </div>
      </div>

      {/* Rota Expressa (Opcional) */}
      <div className="pt-4 border-t border-white/5">
        <p className="mb-4 text-center text-[10px] uppercase tracking-widest text-white/30">Sugestão de rota</p>
        <div className="flex items-center justify-center gap-3">
           {nearbyStations.slice(0, 3).map((s, idx) => (
             <div key={s.id} className="relative flex flex-col items-center">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-white/40",
                  idx === 0 && "border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]"
                )}>
                  {idx + 1}
                </div>
                {idx < 2 && <ArrowRight className="absolute -right-4 top-3.5 h-3 w-3 text-white/10" />}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
