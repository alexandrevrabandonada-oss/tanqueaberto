"use client";

import React, { useState, useEffect, useMemo } from "react";
import { type SurfaceType, SURFACE_PRIORITIES, getTopSurfaces } from "@/lib/ui/surface-orchestrator";
import { trackProductEvent } from "@/lib/telemetry/client";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";

interface SurfaceItem {
  id: string;
  type: SurfaceType;
  content: React.ReactNode;
  isDismissible?: boolean;
}

interface SurfaceOrchestratorProps {
  surfaces: SurfaceItem[];
  onDismiss?: (id: string) => void;
  killSwitches?: Partial<OperationalKillSwitches>;
}

export function SurfaceOrchestrator({ surfaces, onDismiss, killSwitches }: SurfaceOrchestratorProps) {
  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  
  const filteredSurfaces = useMemo(() => surfaces.filter((s: SurfaceItem) => {
    if (killSwitches?.disable_heavy_territorial_widgets && s.type === "INFO_NOTICE") {
      return false;
    }
    return true;
  }), [surfaces, killSwitches?.disable_heavy_territorial_widgets]);

  const activeIds = filteredSurfaces.map((s: SurfaceItem) => s.id);
  const topTypes = useMemo(() => getTopSurfaces(filteredSurfaces.map((s: SurfaceItem) => s.type), 2), [filteredSurfaces]);
  
  // Track impressions
  useEffect(() => {
    topTypes.forEach((type: SurfaceType) => {
      void trackProductEvent({
        eventType: "surface_orchestrated_view" as any,
        pagePath: window.location.pathname,
        scopeType: "ui_surface",
        scopeId: type,
        payload: { priority: SURFACE_PRIORITIES[type] }
      });
    });
  }, [topTypes]);

  if (filteredSurfaces.length === 0) return null;

  const topSurfaces = filteredSurfaces
    .filter((s: SurfaceItem) => topTypes.includes(s.type))
    .sort((a: SurfaceItem, b: SurfaceItem) => SURFACE_PRIORITIES[b.type] - SURFACE_PRIORITIES[a.type]);

  const primary = topSurfaces[0];
  const secondary = topSurfaces[1];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Surface - Always prominent */}
      {primary && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-500">
          {primary.content}
        </div>
      )}

      {/* Secondary Surface - Minimizable or collapsible */}
      {secondary && (
        <div className={cn(
          "overflow-hidden transition-all duration-300 rounded-[20px] border border-white/10 bg-white/5",
          minimized[secondary.id] ? "h-10" : "h-auto"
        )}>
           <div className="flex items-center justify-between px-4 py-2 bg-white/5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                 Aviso Adicional
              </span>
              <div className="flex items-center gap-1">
                 <button 
                   onClick={() => setMinimized(prev => ({ ...prev, [secondary.id]: !prev[secondary.id] }))}
                   className="p-1 text-white/40 hover:text-white"
                 >
                    {minimized[secondary.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                 </button>
                 {secondary.isDismissible && onDismiss && (
                   <button 
                     onClick={() => onDismiss(secondary.id)}
                     className="p-1 text-white/40 hover:text-white"
                   >
                      <X className="h-3 w-3" />
                   </button>
                 )}
              </div>
           </div>
           {!minimized[secondary.id] && (
             <div className="p-1">
                {secondary.content}
             </div>
           )}
        </div>
      )}

      {/* Tertiary items indicator if many */}
      {surfaces.length > 2 && (
        <p className="text-center text-[9px] font-bold uppercase tracking-widest text-white/20">
          + {surfaces.length - 2} outros avisos recolhidos
        </p>
      )}
    </div>
  );
}
