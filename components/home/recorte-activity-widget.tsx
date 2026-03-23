import { Activity, Users, CheckCircle2, MapPin, Zap, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRecorteActivity } from "@/app/actions/recorte-activity";
import { type RecorteActivity } from "@/lib/ops/recorte-activity";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/telemetry/client";

interface RecorteActivityWidgetProps {
  city: string;
  groupSlug?: string;
  isReady?: boolean;
}

function formatRelativeTime(date: Date) {
  const diff = (date.getTime() - Date.now()) / 1000;
  const absDiff = Math.abs(diff);
  
  if (absDiff < 60) return "agora";
  if (absDiff < 3600) return `${Math.floor(absDiff / 60)}m atrás`;
  if (absDiff < 86400) return `${Math.floor(absDiff / 3600)}h atrás`;
  return `${Math.floor(absDiff / 86400)}d atrás`;
}

export function RecorteActivityWidget({ city, groupSlug, isReady }: RecorteActivityWidgetProps) {
  const [data, setData] = useState<RecorteActivity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    
    setLoading(true);
    fetchRecorteActivity(city, groupSlug)
      .then(setData)
      .finally(() => setLoading(false));
  }, [city, groupSlug]);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-white/5 bg-white/5">
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
      </div>
    );
  }

  if (!data) return null;

  const timeAgo = data.lastActivityAt 
    ? formatRelativeTime(new Date(data.lastActivityAt))
    : null;

  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-black/40 p-5 transition-all hover:border-white/20">
      {/* Background Glow */}
      <div className="absolute -right-12 -top-12 h-24 w-24 bg-blue-500/10 blur-3xl" />
      
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10">
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Atividade do Recorte</h3>
              <p className="text-[10px] uppercase tracking-wider text-white/40">{city}</p>
            </div>
          </div>
          {timeAgo && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              VIVO {timeAgo.toUpperCase()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 rounded-2xl bg-white/5 p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-white/40">
              <Users className="h-3 w-3" />
              <span className="text-[10px] uppercase font-bold tracking-tight">Comunidade</span>
            </div>
            <p className="text-lg font-bold text-white">
              {data.recentCollaboratorsCount} <span className="text-xs font-normal text-white/40">testers ativos</span>
            </p>
          </div>
          <div className="space-y-1 rounded-2xl bg-white/5 p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-white/40">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-[10px] uppercase font-bold tracking-tight">Mapeamento</span>
            </div>
            <p className="text-lg font-bold text-white">
              {data.collaborationProgress.toFixed(0)}% <span className="text-xs font-normal text-white/40">coberto</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/30">
              <span>{data.stationsWithHistory} postos com preço</span>
              <span>{data.totalStations} total</span>
           </div>
           <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${data.collaborationProgress}%` }}
              />
           </div>
        </div>

        {(!isReady || data.collaborationProgress < 70) && (
          <div className="pt-2">
            <Button 
              className="w-full justify-between gap-2 border border-blue-500/30 bg-blue-500/10 text-xs font-bold text-blue-400 hover:bg-blue-500 hover:text-white"
              onClick={() => {
                void trackProductEvent({
                  eventType: "recorte_cta_engagement" as any,
                  pagePath: "/",
                  pageTitle: "Mapa vivo",
                  city: city,
                  payload: {
                    progress: data.collaborationProgress,
                    isReady
                  }
                });
              }}
            >
              Abra este recorte enviando preços
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
