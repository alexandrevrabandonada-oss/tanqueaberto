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
  AlertCircle,
  BarChart3,
  Mic,
  LucideIcon
} from "lucide-react";
import { formatRecencyLabel } from "@/lib/format/time";
import { cn } from "@/lib/utils";
import { getSuggestedCollectorAction, type SmartAction } from "@/lib/ops/smart-actions";
import { trackProductEvent } from "@/lib/telemetry/client";

const IconMap: Record<string, LucideIcon> = {
  Zap,
  Camera,
  Mic,
  CheckCircle2,
  MapPin
};

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

  const handleTrack = (action: string) => {
    void trackProductEvent({
      eventType: "hub_action_clicked",
      pagePath: "/hub",
      pageTitle: "Meu Hub",
      payload: { action, city, groupSlug }
    });
  };

  if (isLoading || !activity) return null;

  const isWeak = activity.status === 'weak';
  const isStrong = activity.status === 'strong';
  const smartAction = getSuggestedCollectorAction(city, activity);
  const ActionIcon = IconMap[smartAction.icon] || Zap;

  return (
    <SectionCard className="p-5 space-y-5 border-white/10 bg-[#0a0a0a] overflow-hidden relative group rounded-3xl">
      {/* Visual Activity Sparkline (Simplified) */}
      <div className="absolute top-0 left-0 right-0 h-1 flex gap-0.5 px-1 opacity-20">
        {[...Array(20)].map((_, i) => {
          const hasEvent = activity.recencySignals.length > (i % 5);
          return (
            <div 
              key={i} 
              className={cn(
                "flex-1 h-full transition-all duration-700",
                hasEvent ? "bg-blue-400 group-hover:h-2" : "bg-white/5"
              )} 
            />
          );
        })}
      </div>

      {/* Header: Proof of Life Pulse */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
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
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
            Pulso: {city}
          </h3>
        </div>
        <Badge variant={isStrong ? "default" : isWeak ? "warning" : "secondary"} className="text-[9px] font-black uppercase tracking-tighter h-5 px-2">
          {isStrong ? "Área Quente" : isWeak ? "Área Fria" : "Área Ativa"}
        </Badge>
      </div>

      {/* Main Signal: Last Activity Timeline */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
           <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
           <div className="space-y-0.5">
              <p className="text-sm font-bold text-white/90 leading-tight">
                {activity.activityLabel}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
                <Clock className="w-3 h-3" />
                <span>{activity.lastActivityAt ? formatRecencyLabel(activity.lastActivityAt) : "Sem dados recentes"}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Insights: Evidence Density & Reliability */}
      <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Densidade</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-blue-400">{Math.round(activity.collaborationDensity)}%</span>
            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400/50 rounded-full" style={{ width: `${activity.collaborationDensity}%` }} />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Colaboradores</p>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500/50" />
            <span className="text-sm font-black text-white/80">{activity.recentCollaboratorsCount}</span>
            <span className="text-[9px] text-white/30 font-bold ml-auto">ATIVOS</span>
          </div>
        </div>
      </div>

      {/* contextual Detail: Last Station Touched */}
      {activity.lastStationTouched && (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between group/station transition-all hover:bg-white/5 hover:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/10">
               <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-white/90 truncate uppercase tracking-tight">{activity.lastStationTouched.name}</p>
              <p className="text-[10px] text-white/30 truncate font-medium">{activity.lastStationTouched.neighborhood}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
             <div className="flex gap-0.5">
               {[...Array(3)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
             </div>
             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Auditando</span>
          </div>
        </div>
      )}

      {/* contextual CTA (Smart Action) */}
      <div className="pt-1">
        <ButtonLink 
          href={smartAction.link as any} 
          onClick={() => handleTrack(`smart_action_${smartAction.kind.toLowerCase()}`)}
          className={cn(
            "w-full h-12 rounded-2xl font-black text-[11px] gap-2.5 uppercase tracking-widest transition-all active:scale-95 shadow-lg",
            smartAction.priority === 'high' ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20" : 
            smartAction.priority === 'medium' ? "bg-white/10 hover:bg-white/20 text-white" :
            "bg-white/5 hover:bg-white/10 text-white/70"
          )}
        >
          <ActionIcon className="w-4 h-4" />
          {smartAction.label}
          <ArrowRight className="ml-auto w-4 h-4 opacity-50" />
        </ButtonLink>
        <p className="text-[9px] text-center text-white/30 mt-3 font-medium px-4">
          💡 {smartAction.description}
        </p>
      </div>

      {/* Footer Info: Global Proof of Life Counter */}
      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.3em] text-white/10 pt-2 opacity-50 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <BarChart3 className="w-2.5 h-2.5" />
          <span>Labs Pulse 2.0</span>
        </div>
        <span>{activity.totalAttempts.toLocaleString()} provas processadas</span>
      </div>
    </SectionCard>
  );
}
