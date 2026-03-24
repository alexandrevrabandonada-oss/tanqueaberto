"use client";

import { SectionCard } from "@/components/ui/section-card";
import { type MissionState } from "@/hooks/use-mission";
import { type StationWithReports } from "@/lib/types";
import { MapPinned, ChevronRight, CheckCircle2, Navigation } from "lucide-react";
import Link from "next/link";

interface MissionCardProps {
  mission: MissionState;
  stats: any;
  stations: StationWithReports[];
}

export function MissionCard({ mission, stats, stations }: MissionCardProps) {
  const currentStationIdx = mission.currentIndex;
  const currentStationId = mission.stationIds[currentStationIdx];
  const currentStation = stations.find(s => s.id === currentStationId);
  
  const lastStationId = currentStationIdx > 0 ? mission.stationIds[currentStationIdx - 1] : null;
  const lastStation = lastStationId ? stations.find(s => s.id === lastStationId) : null;
  
  const nextStationId = currentStationIdx + 1 < mission.stationIds.length ? mission.stationIds[currentStationIdx + 1] : null;
  const nextStation = nextStationId ? stations.find(s => s.id === nextStationId) : null;

  return (
    <Link href="/enviar">
      <SectionCard className="p-4 border-[color:var(--color-accent)]/20 bg-gradient-to-br from-[color:var(--color-accent)]/10 to-transparent hover:from-[color:var(--color-accent)]/15 transition-all group overflow-hidden relative">
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[color:var(--color-accent)] text-black shadow-[0_0_15px_rgba(255,199,0,0.3)]">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-[color:var(--color-accent)]">Missão Ativa</p>
                <h3 className="text-sm font-bold text-white">{mission.groupName}</h3>
              </div>
            </div>
            <div className="text-right">
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Progresso</span>
               <p className="text-sm font-black text-[color:var(--color-accent)]">{stats?.completed ?? 0} / {stats?.total ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1 opacity-50">
              <p className="text-[8px] uppercase font-black tracking-widest text-white/40">Visto agora</p>
              <p className="text-[10px] font-bold truncate text-white/80">{lastStation ? (lastStation.namePublic || lastStation.name) : "Início"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] uppercase font-black tracking-widest text-[color:var(--color-accent)] flex items-center gap-1">
                <Navigation className="w-2 h-2" /> Próximo Passo
              </p>
              <p className="text-[10px] font-bold truncate text-white">{currentStation ? (currentStation.namePublic || currentStation.name) : "Finalizando..."}</p>
            </div>
          </div>

          <div className="space-y-1.5">
             <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-[color:var(--color-accent)] transition-all duration-1000 shadow-[0_0_10px_rgba(255,199,0,0.4)]"
                  style={{ width: `${Math.round(((stats?.completed ?? 0) / (stats?.total ?? 1)) * 100)}%` }}
                />
             </div>
          </div>

          <div className="flex items-center justify-between pt-1">
             <div className="flex items-center gap-2 text-[9px] font-bold text-white/40">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {stats?.completed ?? 0} postos reportados
             </div>
             <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-[color:var(--color-accent)] group-hover:translate-x-1 transition-transform">
                Retomar Missão <ChevronRight className="w-3 h-3" />
             </div>
          </div>
        </div>

        {/* Decorative background logo */}
        <MapPinned className="absolute -bottom-4 -right-4 h-24 w-24 text-[color:var(--color-accent)]/5 -rotate-12 pointer-events-none" />
      </SectionCard>
    </Link>
  );
}
