"use client";

import { useEffect, useState } from "react";
import { type RecorteActivity } from "@/lib/ops/recorte-activity";
import { getTerritorialReinforcementAction } from "@/app/hub/actions";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { 
  Activity, 
  MapPin, 
  Camera, 
  Trophy, 
  ArrowRight,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { formatRecencyLabel } from "@/lib/format/time";
import { cn } from "@/lib/utils";
import type { Route } from "next";

interface ProofOfLifeReinforcementProps {
  city: string;
  groupSlug?: string;
}

export function ProofOfLifeReinforcement({ city, groupSlug }: ProofOfLifeReinforcementProps) {
  const [activity, setActivity] = useState<RecorteActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      const data = await getTerritorialReinforcementAction(city, groupSlug);
      setActivity(data);
      setIsLoading(false);
    }
    loadActivity();
  }, [city, groupSlug]);

  if (isLoading || !activity) return null;

  const isWeak = activity.status === 'weak';
  const isStrong = activity.status === 'strong';

  return (
    <SectionCard className="p-4 space-y-4 border-white/10 bg-black/20 overflow-hidden relative group">
      {/* Background Pulse Effect for Strong Areas */}
      {isStrong && (
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Zap className="w-24 h-24 text-blue-400 animate-pulse" />
        </div>
      )}

      {/* Header: Proof of Life Pulse */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
             <Activity className={cn(
               "h-4 w-4",
               isStrong ? "text-blue-400" : isWeak ? "text-orange-400" : "text-white/40"
             )} />
             <div className={cn(
               "absolute inset-0 animate-ping opacity-20",
               isStrong ? "bg-blue-400" : isWeak ? "bg-orange-400" : "bg-white/40"
             )} />
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Atividade em {city}
          </h3>
        </div>
        <Badge variant={isStrong ? "default" : isWeak ? "warning" : "secondary"} className="text-[9px] uppercase tracking-tighter">
          {isStrong ? "Área Quente" : isWeak ? "Área Fria" : "Área Ativa"}
        </Badge>
      </div>

      {/* Main Signal: Last Activity */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/80">
          {activity.activityLabel}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <Clock className="w-3 h-3" />
          <span>{activity.lastActivityAt ? formatRecencyLabel(activity.lastActivityAt) : "Sem dados recentes"}</span>
        </div>
      </div>

      {/* Secondary Signals: Evidence Density */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-bold text-white/60">{activity.stationsWithHistory} / {activity.totalStations}</span>
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-tighter leading-tight">Postos com prova de vida</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-bold text-white/60">{activity.recentCollaboratorsCount}</span>
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-tighter leading-tight">Pesquisadores recentes</p>
        </div>
      </div>

      {/* contextual Detail: Last Station Touched */}
      {activity.lastStationTouched && (
        <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between group/station transition-colors hover:bg-white/8">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
               <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-white/80 truncate">{activity.lastStationTouched.name}</p>
              <p className="text-[9px] text-white/30 truncate">{activity.lastStationTouched.neighborhood}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[8px] border-white/5 text-white/30 group-hover/station:border-blue-500/20 group-hover/station:text-blue-400">
             VIVO
          </Badge>
        </div>
      )}

      {/* Contextual CTA */}
      <div className="pt-2">
        {isWeak ? (
          <ButtonLink 
            href="/postos/sem-atualizacao" 
            className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-black font-bold text-[11px] gap-2"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            REDUZIR SILÊNCIO TERRITORIAL
            <ArrowRight className="w-3.5 h-3.5" />
          </ButtonLink>
        ) : (
          <ButtonLink 
            href="/" 
            className="w-full h-10 bg-[color:var(--color-accent)] text-black font-bold text-[11px] gap-2"
          >
            <Camera className="w-3.5 h-3.5" />
            CONTINUAR COBERTURA
            <ArrowRight className="w-3.5 h-3.5" />
          </ButtonLink>
        )}
      </div>

      {/* Footer Info: Global Proof of Life */}
      <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-white/20 pt-1">
        <span>Bomba Aberta Labs</span>
        <span>{activity.totalAttempts} provas processadas</span>
      </div>
    </SectionCard>
  );
}
