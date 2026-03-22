"use client";

import type { Route } from "next";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import { Badge } from "@/components/ui/badge";
import type { StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { canShowStationOnMap, getStationMarketPresence } from "@/lib/quality/stations";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { cn } from "@/lib/utils";

interface StationMapProps {
  stations: StationWithReports[];
  className?: string;
}

function createPinIcon(status: "recent" | "stale" | "review") {
  const colorClass = status === "recent" ? "map-pin-dot--recent" : status === "review" ? "map-pin-dot--review" : "map-pin-dot--stale";

  return new L.DivIcon({
    className: "custom-map-pin",
    html: `<div class="map-pin-dot ${colorClass}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

export function StationMap({ stations, className = "h-[360px]" }: StationMapProps) {
  const mapStations = stations.filter((station) => canShowStationOnMap(station));

  if (mapStations.length === 0) {
    return (
      <div className={cn("grid place-items-center rounded-[28px] border border-white/8 bg-black/30 px-6 text-center text-sm text-white/58", className)}>
        <div className="space-y-2">
          <p className="text-base font-semibold text-white">Ainda não há coordenadas confiáveis para mostrar no mapa.</p>
          <p>Tente outro bairro, cidade ou aguarde a curadoria concluir a localização.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border border-white/8", className)}>
      <div className="absolute left-3 top-3 z-[401] flex flex-wrap gap-2 rounded-[18px] border border-white/8 bg-black/72 px-3 py-2 text-[11px] text-white/72 backdrop-blur-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Com preço recente
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-white/42" />
          Sem atualização recente
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Em revisão territorial
        </span>
      </div>
      <MapContainer center={[-22.53, -44.12]} zoom={11} scrollWheelZoom={false} className={cn("w-full", className)}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapStations.map((station) => {
          const latest = station.latestReports[0];
          const stationHref = `/postos/${station.id}` as Route;
          const marketPresence = getStationMarketPresence(station);
          const recencyTone = latest ? getRecencyTone(latest.reportedAt) : "stale";
          const pinStatus = station.geoReviewStatus === "manual_review" ? "review" : marketPresence === "recent" ? "recent" : "stale";

          return (
            <Marker key={station.id} position={[station.lat, station.lng]} icon={createPinIcon(pinStatus)}>
              <Popup>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{station.name}</p>
                    <p className="text-xs text-zinc-600">
                      {station.neighborhood}, {station.city}
                    </p>
                  </div>
                  <Badge variant={pinStatus === "recent" ? recencyToneToBadgeVariant(recencyTone) : pinStatus === "review" ? "warning" : "outline"}>
                    {pinStatus === "recent" ? `Atualizado ${formatRecencyLabel(latest!.reportedAt)}` : pinStatus === "review" ? "Localização em revisão" : "Sem atualização recente"}
                  </Badge>
                  {latest ? (
                    <div className="space-y-1 text-xs text-zinc-700">
                      <p>
                        {fuelLabels[latest.fuelType]}: <strong>{formatCurrencyBRL(latest.price)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">Posto cadastrado no território, sem preço recente aprovado.</p>
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
