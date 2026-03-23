"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { canShowStationOnMap } from "@/lib/quality/stations";
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

export function StationMap({ stations, className = "h-[360px]", returnToHref, fuelFilter = "all" }: StationMapProps) {
  const mapStations = stations.filter((station) => canShowStationOnMap(station));
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const selectedStation = useMemo(() => mapStations.find((station) => station.id === selectedStationId) ?? null, [mapStations, selectedStationId]);
  const selectedReport = selectedStation ? getSelectedStationReport(selectedStation, fuelFilter) : null;
  const selectedTone = selectedReport ? getRecencyTone(selectedReport.reportedAt) : "stale";

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
      <MapContainer center={[-22.53, -44.12]} zoom={11} scrollWheelZoom={false} className={cn("w-full", className)}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapStations.map((station) => {
          const selectedReportForStation = getSelectedStationReport(station, fuelFilter);
          const stationHref = getStationHref(station.id, returnToHref);
          const sendHref = getSendHref(station.id, returnToHref, fuelFilter);
          const recencyTone = selectedReportForStation ? getRecencyTone(selectedReportForStation.reportedAt) : "stale";
          const pinStatus = station.geoReviewStatus === "manual_review" ? "review" : selectedReportForStation && recencyTone !== "stale" ? "recent" : "stale";

          return (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createPinIcon(pinStatus)}
              eventHandlers={{
                click: () => {
                  setSelectedStationId(station.id);
                  rememberStationVisit({ id: station.id, name: station.name, city: station.city });
                  void trackProductEvent({ eventType: "station_clicked", pagePath: returnToHref ?? "/", pageTitle: station.name, stationId: station.id, city: station.city, fuelType: selectedReportForStation?.fuelType ?? null, scopeType: "station", scopeId: station.id, payload: { source: "map-pin" } });
                }
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{station.name}</p>
                    <p className="text-xs text-zinc-600">
                      {station.neighborhood}, {station.city}
                    </p>
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
                      onClick={() => rememberStationVisit({ id: station.id, name: station.name, city: station.city })}
                    >
                      Ver posto
                    </Link>
                    <Link
                      href={sendHref}
                      className="text-xs font-semibold text-zinc-900 underline"
                      onClick={() => rememberStationVisit({ id: station.id, name: station.name, city: station.city })}
                    >
                      Enviar preço
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute inset-x-3 bottom-3 z-[402] pointer-events-none">
        <div className="pointer-events-auto rounded-[24px] border border-white/8 bg-black/85 p-4 backdrop-blur-md">
          {selectedStation ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/42">Pin tocado</p>
                  <h4 className="mt-1 text-base font-semibold text-white">{selectedStation.name}</h4>
                  <p className="text-sm text-white/54">
                    {selectedStation.neighborhood}, {selectedStation.city}
                  </p>
                </div>
                <Badge variant={selectedReport ? recencyToneToBadgeVariant(selectedTone) : "outline"}>
                  {selectedReport ? formatRecencyLabel(selectedReport.reportedAt) : "Sem preço"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/56">
                {selectedReport ? <Badge variant="default">{fuelFilter === "all" ? fuelLabels[selectedReport.fuelType] : `Filtro: ${fuelLabels[fuelFilter]}`}</Badge> : null}
                {selectedReport ? <Badge variant={recencyToneToBadgeVariant(selectedTone)}>{selectedTone === "stale" ? "Sem atualização recente" : "Preço recente"}</Badge> : <Badge variant="outline">Posto cadastrado</Badge>}
                {selectedStation.geoReviewStatus === "manual_review" ? <Badge variant="warning">Localização em revisão</Badge> : null}
              </div>
              <p className="text-sm text-white/58">
                {selectedReport
                  ? `${fuelLabels[selectedReport.fuelType]} · ${formatCurrencyBRL(selectedReport.price)} · ${formatRecencyLabel(selectedReport.reportedAt)}`
                  : "Posto cadastrado no território, sem preço recente aprovado."}
              </p>
              <div className="flex gap-2">
                <ButtonLink
                  href={getStationHref(selectedStation.id, returnToHref)}
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    rememberStationVisit({ id: selectedStation.id, name: selectedStation.name, city: selectedStation.city });
                    void trackProductEvent({ eventType: "station_clicked", pagePath: getStationHref(selectedStation.id, returnToHref), pageTitle: selectedStation.name, stationId: selectedStation.id, city: selectedStation.city, fuelType: selectedReport?.fuelType ?? null, scopeType: "station", scopeId: selectedStation.id, payload: { source: "map-card-open" } });
                  }}
                >
                  Abrir posto
                </ButtonLink>
                <ButtonLink
                  href={getSendHref(selectedStation.id, returnToHref, fuelFilter)}
                  className="flex-1"
                  onClick={() => {
                    rememberStationVisit({ id: selectedStation.id, name: selectedStation.name, city: selectedStation.city });
                    void trackProductEvent({ eventType: "submit_opened", pagePath: getSendHref(selectedStation.id, returnToHref, fuelFilter), pageTitle: selectedStation.name, stationId: selectedStation.id, city: selectedStation.city, fuelType: selectedReport?.fuelType ?? null, scopeType: "submission", scopeId: selectedStation.id, payload: { source: "map-card-send" } });
                  }}
                >
                  Enviar preço agora
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 text-sm text-white/58">
              <p>Toque em um pin para ver o card rápido e seguir para o posto ou para o envio.</p>
              <button type="button" onClick={() => setSelectedStationId(mapStations[0]?.id ?? null)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/72">
                Abrir um pin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
