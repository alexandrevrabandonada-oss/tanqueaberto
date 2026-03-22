"use client";

import type { Route } from "next";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import { fuelLabels, stations } from "@/lib/mock-data";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

const marker = new L.DivIcon({
  className: "custom-map-pin",
  html: '<div class="map-pin-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

export function StationMap() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8">
      <MapContainer center={[-22.53, -44.12]} zoom={11} scrollWheelZoom={false} className="h-[360px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((station) => {
          const latestReport = station.latestReports[0];
          const stationHref = `/postos/${station.id}` as Route;

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
                  {latestReport ? (
                    <div className="text-xs text-zinc-700">
                      <p>
                        {fuelLabels[latestReport.fuelType]}: <strong>{formatCurrency(latestReport.price)}</strong>
                      </p>
                      <p>Atualizado {formatRelativeTime(latestReport.reportedAt)}</p>
                    </div>
                  ) : null}
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
