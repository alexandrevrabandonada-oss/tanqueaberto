"use client";

import { useStreetMode } from "@/hooks/use-street-mode";
import { type StationWithReports } from "@/lib/types";
import { SectionCard } from "@/components/ui/section-card";
import { MapPin, Map as MapIcon, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

interface HubRecentsProps {
  stations: StationWithReports[];
}

export function HubRecents({ stations }: HubRecentsProps) {
  const { recentIds } = useStreetMode();
  
  const recentStations = recentIds
    .map(id => stations.find(s => s.id === id))
    .filter((s): s is StationWithReports => !!s)
    .slice(0, 3);

  if (recentStations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/40" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Recentes</h2>
        </div>
        <Link href="/" className="text-[10px] font-bold text-blue-400 hover:underline">Ver Mapa</Link>
      </div>

      <div className="grid gap-2">
        {recentStations.map(station => (
          <Link key={station.id} href={`/enviar?stationId=${station.id}` as Route}>
            <SectionCard className="p-3 border-white/5 bg-white/2 hover:bg-white/5 transition-all flex justify-between items-center group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-white/5 text-white/40 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate text-white/80 group-hover:text-white transition-colors">
                    {station.namePublic || station.name}
                  </p>
                  <p className="text-[10px] text-white/30 truncate">
                    {station.neighborhood}, {station.city}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-blue-400 transition-colors" />
            </SectionCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
