"use client";

import { SectionCard } from "@/components/ui/section-card";
import { type RecorteActivity } from "@/lib/ops/recorte-activity";
import { formatRecencyLabel } from "@/lib/format/time";
import { Activity, Users, MapPinned, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecortePulseWidgetProps {
  activity: RecorteActivity;
  cityName: string;
}

export function RecortePulseWidget({ activity, cityName }: RecortePulseWidgetProps) {
  const isLive = activity.lastActivityAt && 
    (Date.now() - new Date(activity.lastActivityAt).getTime()) < 60 * 60 * 1000;

  const coveragePercent = Math.round(activity.collaborationProgress);
  const needsImpact = coveragePercent < 50;

  return (
    <SectionCard className="p-4 border-white/5 bg-white/5 relative overflow-hidden group">
      {/* Pulse Background Glow */}
      {isLive && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[60px] animate-pulse" />
      )}

      <div className="relative z-10 space-y-4">
        <header className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isLive ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-white/20"
              )} />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Pulso Operacional: {cityName}</h3>
            </div>
            <p className="text-xs font-bold mt-1 text-white/80">{activity.activityLabel}</p>
          </div>
          {activity.lastActivityAt && (
            <span className="text-[9px] font-black uppercase tracking-tighter text-white/20">
              Há {formatRecencyLabel(activity.lastActivityAt)}
            </span>
          )}
        </header>

        <div className="grid grid-cols-3 gap-2">
           <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-white/30">
                 <Users className="w-3 h-3" />
                 <span className="text-[8px] font-bold uppercase tracking-widest">Colaboradores</span>
              </div>
              <p className="text-sm font-black">{activity.recentCollaboratorsCount} <span className="text-[9px] text-white/20">ativos</span></p>
           </div>
           <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-white/30">
                 <MapPinned className="w-3 h-3" />
                 <span className="text-[8px] font-bold uppercase tracking-widest">Mapeamento</span>
              </div>
              <p className="text-sm font-black">{activity.stationsWithHistory} <span className="text-[9px] text-white/20">/ {activity.totalStations}</span></p>
           </div>
           <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-white/30">
                 <Activity className="w-3 h-3" />
                 <span className="text-[8px] font-bold uppercase tracking-widest">Cobertura</span>
              </div>
              <p className="text-sm font-black text-white">{coveragePercent}%</p>
           </div>
        </div>

        {/* Dynamic CTA */}
        {needsImpact ? (
          <Link href="/enviar">
            <div className="mt-2 p-3 rounded-2xl bg-[color:var(--color-accent)] text-black flex items-center justify-between hover:bg-[color:var(--color-accent)]/90 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-3">
                 <Target className="w-4 h-4" />
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none">Baixa Cobertura</p>
                    <p className="text-xs font-bold leading-tight">Mapeie 1 de {activity.stationsAwaitingPhoto} postos</p>
                 </div>
              </div>
              <Zap className="w-4 h-4 animate-bounce" />
            </div>
          </Link>
        ) : (
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Background Icon */}
      <Activity className={cn(
        "absolute -bottom-6 -left-6 h-20 w-20 pointer-events-none transition-colors",
        isLive ? "text-green-500/5" : "text-white/5"
      )} />
    </SectionCard>
  );
}
