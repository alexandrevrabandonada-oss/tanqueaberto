'use client';

import { useState, useEffect } from "react";
import { MapPin, Zap, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHubRecommendationsAction } from "@/app/hub/actions";
import { HubRecommendation } from "@/lib/ops/hub-recommendation";
import { trackProductEvent } from "@/lib/telemetry/client";
import Link from "next/link";

interface HubGeofencingCTAProps {
  nickname: string;
}

export function HubGeofencingCTA({ nickname }: HubGeofencingCTAProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [recommendations, setRecommendations] = useState<HubRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    const fetchRecs = async () => {
      setLoading(true);
      const recs = await getHubRecommendationsAction(nickname, coords?.lat, coords?.lng);
      setRecommendations(recs);
      setLoading(false);
    };

    fetchRecs();
  }, [nickname, coords]);

  if (loading && recommendations.length === 0) {
    return (
      <div className="animate-pulse bg-white/5 h-24 rounded-3xl border border-white/5" />
    );
  }

  if (recommendations.length === 0) return null;

  const topRec = recommendations[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Próximo Passo Sugerido</h3>
      </div>
      
      <Link 
        href={topRec.actionUrl as any}
        onClick={() => {
          void trackProductEvent({
            eventType: "hub_action_clicked",
            pagePath: "/hub",
            payload: {
              actionType: "recommendation",
              recommendationType: topRec.type,
              recommendationId: topRec.id,
              hasCoords: !!coords,
              viewport: typeof window !== "undefined" ? (window.innerWidth >= 1024 ? "desktop" : window.innerWidth >= 768 ? "tablet" : "mobile") : "unknown"
            }
          });
        }}
        className={cn(
          "group block p-4 rounded-3xl border transition-all duration-300 active:scale-[0.98]",
          topRec.type === 'mission' ? "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40" :
          topRec.type === 'pending_fix' ? "bg-red-500/10 border-red-500/20 hover:border-red-500/40" :
          "bg-white/[0.03] border-white/5 hover:border-white/10"
        )}
      >
        <div className="flex gap-4 items-start">
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
            topRec.type === 'mission' ? "bg-blue-500/20 text-blue-400" :
            topRec.type === 'pending_fix' ? "bg-red-500/20 text-red-400" :
            "bg-white/10 text-white/60"
          )}>
            {topRec.type === 'mission' ? <Zap className="w-5 h-5" /> :
             topRec.type === 'pending_fix' ? <AlertCircle className="w-5 h-5" /> :
             topRec.type === 'nearby_empty' ? <MapPin className="w-5 h-5" /> :
             <CheckCircle className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-0.5">
               <h4 className="font-bold text-sm truncate">{topRec.title}</h4>
               {topRec.metadata?.distance && (
                 <span className="text-[9px] font-bold text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
                   {topRec.metadata.distance}
                 </span>
               )}
            </div>
            <p className="text-[11px] text-white/40 leading-snug line-clamp-2">
              {topRec.description}
            </p>
          </div>
          
          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors mt-3" />
        </div>
      </Link>
    </div>
  );
}
