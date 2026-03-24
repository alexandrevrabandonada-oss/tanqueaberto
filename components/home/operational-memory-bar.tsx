"use client";

import React from "react";
import { Star, Clock3, MapPin, LayoutList, X, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOperationalMemory, MemoryStation, MemoryCut } from "@/hooks/use-operational-memory";
import { trackProductEvent } from "@/lib/telemetry/client";
import { useRouter } from "next/navigation";
import { Route } from "next";

export function OperationalMemoryBar() {
  const router = useRouter();
  const { memory, isLoaded, togglePinStation, togglePinCut } = useOperationalMemory();

  if (!isLoaded || (memory.recentStations.length === 0 && memory.recentCuts.length === 0 && memory.pinnedStations.length === 0)) {
    return null;
  }

  const handleStationClick = (station: MemoryStation) => {
    void trackProductEvent({
      eventType: "memory_shortcut_click" as any,
      pagePath: "/",
      stationId: station.id,
      payload: { type: 'station', name: station.name }
    });
    router.push(`/postos/${station.id}` as Route);
  };

  const handleCutClick = (cut: MemoryCut) => {
    void trackProductEvent({
      eventType: "memory_shortcut_click" as any,
      pagePath: "/",
      payload: { type: cut.type, id: cut.id, name: cut.name }
    });
    const url = cut.type === 'city' ? `/?city=${cut.id}` : `/?groupId=${cut.id}`;
    router.push(url as Route);
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2 px-1 min-w-max">
        {/* Pinned Stations / Cuts first */}
        {memory.recentCuts.map((cut) => (
          <button
            key={`cut-${cut.id}`}
            onClick={() => handleCutClick(cut)}
            className="flex items-center gap-2 px-3 h-10 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group"
          >
            {cut.type === 'city' ? <MapPin className="h-3.5 w-3.5 text-purple-400" /> : <LayoutList className="h-3.5 w-3.5 text-blue-400" />}
            <span className="text-[10px] font-black uppercase tracking-tight italic">{cut.name}</span>
          </button>
        ))}

        {memory.recentStations.map((station) => (
          <button
            key={`station-${station.id}`}
            onClick={() => handleStationClick(station)}
            className="flex items-center gap-2 px-3 h-10 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group"
          >
            <Clock3 className="h-3.5 w-3.5 text-orange-400/60" />
            <span className="text-[10px] font-black uppercase tracking-tight italic line-clamp-1 max-w-[120px]">
              {station.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
