"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Info, Navigation, Camera, LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { QuickActionGroup, QuickActionButton } from "@/components/ui/quick-action";
import type { StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";
import { getSelectedStationReport, type FuelFilter } from "@/lib/filters/public";
import { rememberStationVisit } from "@/lib/navigation/home-context";

interface StationMapProps {
  stations: StationWithReports[];
  className?: string;
  returnToHref?: string;
  fuelFilter?: FuelFilter;
  center?: { lat: number; lng: number } | null;
}

function ChangeView({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], 13);
  }, [center.lat, center.lng, map]);
  return null;
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

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: FuelFilter) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  const base = `/enviar?stationId=${stationId}${fuelParam}#photo`;
  return returnToHref ? (`${base}&returnTo=${encodeURIComponent(returnToHref)}` as Route) : (base as Route);
}

export function StationMap({ stations, className = "h-[360px]", returnToHref, fuelFilter = "all", center }: StationMapProps) {
  const mapStations = stations.filter((station) => canShowStationOnMap(station));
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const selectedStation = useMemo(() => mapStations.find((station) => station.id === selectedStationId) ?? null, [mapStations, selectedStationId]);
  const selectedReport = selectedStation ? getSelectedStationReport(selectedStation, fuelFilter) : null;
  const selectedTone = selectedReport ? getRecencyTone(selectedReport.reportedAt) : "stale";
  const selectedStationName = selectedStation ? getStationPublicName(selectedStation) : "";

  if (mapStations.length === 0) {
    return (
      <div className={cn("grid place-items-center rounded-[28px] border border-white/8 bg-black/30 px-6 text-center text-sm text-white/58", className)}>
        <div className="space-y-2">
          <p className="text-base font-semibold text-white">Ainda não há coordenadas confiáveis para mostrar no mapa.</p>
          <p>Tente outra cidade, outro bairro ou aguarde a curadoria concluir a localização.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border border-white/8", className)}>
      <div className="absolute left-3 top-3 z-[401] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2 rounded-[18px] border border-white/8 bg-black/72 px-3 py-2 text-[11px] text-white/72 backdrop-blur-sm">
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
        <p className="w-full text-[10px] leading-relaxed text-white/48">Todos os postos mostram o cadastro visível. Só com preço recente mostra apenas o que já foi aprovado.</p>
      </div>
      <MapContainer 
        center={[-22.53, -44.12]} 
        zoom={11} 
        scrollWheelZoom={false} 
        className={cn("w-full", className)}
        whenReady={() => {
          void trackProductEvent({
            eventType: "map_ready_performance" as any,
            pagePath: returnToHref ?? "/",
            pageTitle: "Mapa vivo",
            payload: {
              timestamp: Date.now(),
              stationCount: mapStations.length
            }
          });
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center && <ChangeView center={center} />}
        {mapStations.map((station) => {
          const selectedReportForStation = getSelectedStationReport(station, fuelFilter);
          const stationHref = getStationHref(station.id, returnToHref);
          const sendHref = getSendHref(station.id, returnToHref, fuelFilter);
          const recencyTone = selectedReportForStation ? getRecencyTone(selectedReportForStation.reportedAt) : "stale";
          const pinStatus = station.geoReviewStatus === "manual_review" ? "review" : selectedReportForStation && recencyTone !== "stale" ? "recent" : "stale";
          const displayName = getStationPublicName(station);

          return (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createPinIcon(pinStatus)}
              eventHandlers={{
                click: () => {
                  setSelectedStationId(station.id);
                  rememberStationVisit({ id: station.id, name: displayName, city: station.city });
                  void trackProductEvent({ eventType: "station_clicked", pagePath: returnToHref ?? "/", pageTitle: displayName, stationId: station.id, city: station.city, fuelType: selectedReportForStation?.fuelType ?? null, scopeType: "station", scopeId: station.id, payload: { source: "map-pin" } });
                }
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
                    <p className="text-xs text-zinc-600">
                      {station.neighborhood}, {station.city}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">{station.brand || "Cadastro territorial"}</p>
                  </div>
                  <Badge variant={pinStatus === "recent" ? recencyToneToBadgeVariant(recencyTone) : pinStatus === "review" ? "warning" : "outline"}>
                    {pinStatus === "recent"
                      ? `Atualizado ${formatRecencyLabel(selectedReportForStation!.reportedAt)}`
                      : pinStatus === "review"
                        ? "Localização em revisão"
                        : "Sem atualização recente"}
                  </Badge>
                  {selectedReportForStation ? (
                    <div className="space-y-1 text-xs text-zinc-700">
                      <p>
                        {fuelLabels[selectedReportForStation.fuelType]}: <strong>{formatCurrencyBRL(selectedReportForStation.price)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">Posto cadastrado no território, sem preço recente aprovado.</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={stationHref}
                      className="text-xs font-semibold text-zinc-900 underline"
                      onClick={() => rememberStationVisit({ id: station.id, name: displayName, city: station.city })}
                    >
                      Ver posto
                    </Link>
                    <Link
                      href={sendHref}
                      className="text-xs font-semibold text-zinc-900 underline"
                      onClick={() => {
                        rememberStationVisit({ id: station.id, name: displayName, city: station.city });
                        void trackProductEvent({ eventType: "camera_opened_from_station", pagePath: sendHref, pageTitle: displayName, stationId: station.id, city: station.city, fuelType: selectedReportForStation?.fuelType ?? null, scopeType: "submission", scopeId: station.id, payload: { source: "map-popup", compactMode: true, action: "photo" } });
                      }}
                    >
                      Foto
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className={cn(
        "absolute inset-x-0 bottom-0 z-[402] px-3 pb-3 transition-transform duration-300 ease-out",
        selectedStation ? "translate-y-0" : "translate-y-12 pointer-events-none opacity-0"
      )}>
        <div className="rounded-[28px] border border-white/12 bg-black/90 p-5 shadow-2xl backdrop-blur-xl">
          {selectedStation ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Pin Selecionado</span>
                    {selectedStation.geoReviewStatus === "manual_review" && (
                      <Badge variant="warning" className="h-4 py-0 text-[9px]">Revisão</Badge>
                    )}
                  </div>
                  <h4 className="mt-1 truncate text-lg font-black tracking-tight text-white uppercase italic">{selectedStationName}</h4>
                  <p className="truncate text-sm font-medium text-white/54">
                    {selectedStation.neighborhood}, {selectedStation.city}
                  </p>
                </div>
                
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {selectedReport ? (
                    <div className="text-right">
                      <div className="text-xl font-black tracking-tighter text-white">{formatCurrencyBRL(selectedReport.price)}</div>
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{fuelLabels[selectedReport.fuelType]}</div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Sem preço</Badge>
                  )}
                </div>
              </div>

              <QuickActionGroup 
                className="bg-white/5 border border-white/5"
                onMisclick={() => {
                   void trackProductEvent({ 
                     eventType: "quick_action_misclick" as any, 
                     pagePath: returnToHref ?? "/", 
                     pageTitle: selectedStationName, 
                     stationId: selectedStation.id 
                   });
                }}
              >
                <QuickActionButton
                  icon={Camera}
                  label="Foto"
                  desktopLabel="Abrir câmera"
                  variant="primary"
                  isStreetMode={true}
                  href={getSendHref(selectedStation.id, returnToHref, fuelFilter)}
                  onClick={() => {
                    rememberStationVisit({ id: selectedStation.id, name: selectedStationName, city: selectedStation.city });
                    void trackProductEvent({ 
                      eventType: "camera_opened_from_station", 
                      pagePath: getSendHref(selectedStation.id, returnToHref, fuelFilter), 
                      pageTitle: selectedStationName, 
                      stationId: selectedStation.id, 
                      city: selectedStation.city, 
                      fuelType: selectedReport?.fuelType ?? null, 
                      scopeType: "submission", 
                      scopeId: selectedStation.id, 
                      payload: { source: "map_sheet", action: "photo" } 
                    });
                  }}
                />

                <QuickActionButton
                  icon={Navigation}
                  label="Rota"
                  desktopLabel="Traçar rota"
                  variant="secondary"
                  isStreetMode={true}
                  onClick={() => {
                    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    import("@/lib/navigation/external-maps").then(({ openExternalNavigation }) => {
                      openExternalNavigation(isMobile ? "waze" : "google", {
                        lat: selectedStation.lat,
                        lng: selectedStation.lng,
                        stationId: selectedStation.id,
                        stationName: selectedStationName,
                        source: "map_sheet"
                      });
                    });
                  }}
                />

                <QuickActionButton
                  icon={Info}
                  label="Ver"
                  desktopLabel="Abrir posto"
                  variant="outline"
                  isStreetMode={true}
                  href={getStationHref(selectedStation.id, returnToHref)}
                  onClick={() => {
                    rememberStationVisit({ id: selectedStation.id, name: selectedStationName, city: selectedStation.city });
                    void trackProductEvent({ 
                      eventType: "station_clicked", 
                      pagePath: getStationHref(selectedStation.id, returnToHref), 
                      pageTitle: selectedStationName, 
                      stationId: selectedStation.id, 
                      city: selectedStation.city, 
                      fuelType: selectedReport?.fuelType ?? null, 
                      scopeType: "station", 
                      scopeId: selectedStation.id, 
                      payload: { source: "map_sheet", action: "details" } 
                    });
                  }}
                />
              </QuickActionGroup>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest py-1">
              <span>Selecione um posto</span>
              <button 
                onClick={() => setSelectedStationId(mapStations[0]?.id || null)}
                className="text-[color:var(--color-accent)] animate-pulse"
              >
                Abrir mais próximo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


