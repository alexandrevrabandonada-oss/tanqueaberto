"use client";

import { useMissionContext } from "./mission-context";
import { X, ChevronRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";

export function MissionOverlay() {
  const { mission, progress, stats, endMission, nextStation, currentStationId } = useMissionContext();

  if (!mission) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-300">
      <div className="bg-zinc-900/95 backdrop-blur-md border-b border-yellow-400/20 px-4 py-3 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="accent" className="h-4 px-1.5 text-[8px] font-bold">MISSÃO ATIVA</Badge>
              <span className="text-[10px] text-white/40 uppercase tracking-widest truncate">
                {mission.groupName}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white truncate leading-tight mt-0.5">
              {stats?.current} de {stats?.total} postos
            </h3>
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => nextStation()}
               className="p-2 text-white/40 hover:text-white transition active:scale-90"
               title="Pular posto"
             >
               <SkipForward className="h-4 w-4" />
             </button>
             <div className="h-8 w-px bg-white/10 mx-1" />
             <button 
               onClick={endMission}
               className="p-2 text-white/40 hover:text-white transition active:scale-90"
               title="Encerrar missão"
             >
               <X className="h-4 w-4" />
             </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-yellow-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Target prompt if on home or map */}
      {currentStationId && (
        <div className="max-w-md mx-auto mt-2 px-4">
          <Link 
            href={`/enviar?stationId=${currentStationId}#photo` as Route}
            className="flex items-center justify-between bg-yellow-400 text-black px-4 py-3 rounded-2xl shadow-lg animate-bounce-subtle active:scale-[0.98] transition"
          >
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Próximo Alvo</span>
              <span className="text-sm font-black">ABRIR CÂMERA AGORA</span>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      )}
    </div>
  );
}
