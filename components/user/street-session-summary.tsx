"use client";

import React from "react";
import { useStreetSession } from "@/hooks/use-street-session";
import { Map, Footprints, Camera, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreetSessionSummary() {
  const { session, isActive, stationsSeenCount, stationsTouchedCount } = useStreetSession();

  if (!session || (stationsSeenCount === 0 && session.enviosIniciados === 0)) {
    return null;
  }

  const completionRate = session.enviosIniciados > 0 
    ? Math.round((session.enviosConcluidos / session.enviosIniciados) * 100) 
    : 0;

  return (
    <div className={cn(
      "flex flex-col gap-3 sm:gap-4 rounded-[32px] p-5 sm:p-6 transition-all border",
      isActive 
        ? "bg-zinc-900/40 border-white/10 shadow-xl shadow-black/20" 
        : "bg-white/[0.02] border-white/5 opacity-80"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-full p-2.5",
            isActive ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-white/40"
          )}>
            <Footprints className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white uppercase italic tracking-tight">
                {isActive ? "Sessão de Rua Ativa" : "Resumo da Última Saída"}
              </p>
              {isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-white/50">Instrumentação automática de campo</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 tracking-widest">
            <Map className="h-3 w-3" /> Radar
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{stationsSeenCount}</span>
            <span className="text-[10px] text-white/40 font-medium">postos vistos</span>
          </div>
          <p className="text-[9px] text-white/20 leading-tight">
            Interações: {stationsTouchedCount} cliques
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 tracking-widest">
            <Zap className="h-3 w-3" /> Eficiência
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-xl font-bold",
              completionRate > 80 ? "text-green-400" : "text-white"
            )}>
              {completionRate}%
            </span>
            <span className="text-[10px] text-white/40 font-medium">dos envios</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full bg-green-500/60 rounded-full transition-all duration-1000" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-orange-500/5 border border-orange-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-bold text-white/90">Progresso Operacional</span>
          </div>
          <span className="text-[10px] font-mono text-orange-400/60 uppercase">
            {session.enviosConcluidos} de {session.enviosIniciados} concluídos
          </span>
        </div>
        <p className="text-[11px] text-white/40 leading-relaxed italic">
          {session.enviosConcluidos > 0 
            ? "Você está fechando lacunas reais no recorte. Continue assim!" 
            : "Passe pelos postos e capture os preços para validar o território."}
        </p>
      </div>

      {isActive && (
        <button 
          onClick={() => {
            // No action needed for now, it's a summary
          }}
          className="w-full flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors group"
        >
          <span>Acompanhar em Tempo Real</span>
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
