"use client";

import React from "react";
import { MapPin, LayoutList, WifiOff, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { useOperationalFocus } from "@/hooks/use-operational-focus";
import { useMissionContext } from "@/components/mission/mission-context";
import { type SurfaceType } from "@/lib/ui/surface-orchestrator";
import { trackProductEvent } from "@/lib/telemetry/client";
import { Route } from "next";

export interface RetentionSurfaceItem {
  id: string;
  type: SurfaceType;
  content: React.ReactNode;
}

export function useRetentionSurfaces() {
  const router = useRouter();
  const { focus, pendingSubmissionsCount } = useOperationalFocus();
  const { mission } = useMissionContext();

  const surfaces: RetentionSurfaceItem[] = [];

  // 1. Pending Offline Submissions
  if (pendingSubmissionsCount > 0) {
    surfaces.push({
      id: "retention_offline_queue",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-orange-500/10 border border-orange-500/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-orange-500/20 p-2">
               <WifiOff className="h-4 w-4 text-orange-400" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Envios Pendentes</p>
               <p className="text-xs text-white/60">Você tem {pendingSubmissionsCount} preço(s) aguardando conexão.</p>
             </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "retention_resume_click" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "offline_queue" 
              });
              router.push("/historico" as Route);
            }}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors"
          >
             <ArrowRight className="h-4 w-4 text-white" />
          </button>
        </div>
      )
    });
  }

  // 2. Active Mission Resumption
  if (mission) {
    surfaces.push({
      id: "retention_active_mission",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[color:var(--color-accent)]/10 border border-[color:var(--color-accent)]/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-[color:var(--color-accent)]/20 p-2">
               <LayoutList className="h-4 w-4 text-[color:var(--color-accent)]" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Missão em Aberto</p>
               <p className="text-xs text-white/60">Continue a missão em {mission.groupName}.</p>
             </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "retention_resume_click" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "mission_resume" 
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-full bg-[color:var(--color-accent)]/20 p-2 hover:bg-[color:var(--color-accent)]/30 transition-colors"
          >
             <span className="text-xs font-bold text-[color:var(--color-accent)] px-1">RETOMAR</span>
          </button>
        </div>
      )
    });
  }

  // 3. Last Viewed Town (Recorte Forte)
  if (!mission && focus.lastTownSlug && focus.lastTownName) {
    surfaces.push({
      id: "retention_last_town",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-purple-500/10 border border-purple-500/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-purple-500/20 p-2">
               <MapPin className="h-4 w-4 text-purple-400" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Voltar para {focus.lastTownName}?</p>
               <p className="text-xs text-white/60">Veja os últimos preços ou inicie uma missão.</p>
             </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "retention_resume_click" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "town_resume" 
              });
              router.push(`/?city=${focus.lastTownSlug}` as Route);
            }}
            className="rounded-full bg-purple-500/20 p-2 hover:bg-purple-500/30 transition-colors"
          >
             <ArrowRight className="h-4 w-4 text-purple-400" />
          </button>
        </div>
      )
    });
  }

  return surfaces;
}
