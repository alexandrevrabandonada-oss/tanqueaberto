"use client";

import type { Route } from "next";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import { Badge } from "@/components/ui/badge";
import type { StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { cn } from "@/lib/utils";

const marker = new L.DivIcon({
  className: "custom-map-pin",
  html: '<div class="map-pin-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

interface StationMapProps {
  stations: StationWithReports[];
  className?: string;
}

export function StationMap({ stations, className = "h-[360px]" }: StationMapProps) {
  if (stations.length === 0) {
    return (
      <div className={cn("grid place-items-center rounded-[28px] border border-white/8 bg-black/30 px-6 text-center text-sm text-white/58", className)}>
        <div className="space-y-2">
          <p className="text-base font-semibold text-white">Ainda não há postos ativos para mostrar.</p>
          <p>Tente outro bairro, cidade ou aguarde novos dados entrarem.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-[28px] border border-white/8", className)}>
      <MapContainer center={[-22.53, -44.12]} zoom={11} scrollWheelZoom={false} className={cn("w-full", className)}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((station) => {
          const latest = station.latestReports[0];
          const stationHref = `/postos/${station.id}` as Route;
          const recencyTone = latest ? getRecencyTone(latest.reportedAt) : "stale";

          return (
            <Marker key={station.id} position={[station.lat, station.lng]} icon={marker}>
              <Popup>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{station.name}</p>
                    <p className="text-xs text-zinc-600">
                      {station.neighborhood}, {station.city}
                    </p>
                  </div>
                  {latest ? (
                    <div className="space-y-1 text-xs text-zinc-700">
                      <p>
                        {fuelLabels[latest.fuelType]}: <strong>{formatCurrencyBRL(latest.price)}</strong>
                      </p>
                      <Badge variant={recencyToneToBadgeVariant(recencyTone)}>Atualizado {formatRecencyLabel(latest.reportedAt)}</Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">Sem atualização recente.</p>
                  )}
                  <Link href={stationHref} className="text-xs font-semibold text-zinc-900 underline">
                    Ver posto
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
