"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";

const seedPinIcon = new L.DivIcon({
  className: "custom-map-pin",
  html: '<div class="map-pin-dot map-pin-dot--recent"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function MapCenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], 16);
  }, [center.lat, center.lng, map]);

  return null;
}

function DraggableSeedMarker({
  position,
  onChange
}: {
  position: { lat: number; lng: number };
  onChange: (next: { lat: number; lng: number }) => void;
}) {
  const [draggable, setDraggable] = useState(true);
  const markerRef = useRef<L.Marker | null>(null);

  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });

  return (
    <Marker
      draggable={draggable}
      icon={seedPinIcon}
      position={[position.lat, position.lng]}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (!marker) return;
          const point = marker.getLatLng();
          onChange({ lat: point.lat, lng: point.lng });
        },
        dblclick: () => setDraggable((value) => !value)
      }}
    />
  );
}

interface StationSeedMapProps {
  currentCoords: { lat: number; lng: number };
  locationConfirmed: boolean;
  onChange: (next: { lat: number; lng: number }) => void;
  onToggleConfirm: () => void;
}

export function StationSeedMap({ currentCoords, locationConfirmed, onChange, onToggleConfirm }: StationSeedMapProps) {
  return (
    <div className="space-y-2">
      <div className="h-52 overflow-hidden rounded-[18px] border border-white/10">
        <MapContainer center={[currentCoords.lat, currentCoords.lng]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapCenter center={currentCoords} />
          <DraggableSeedMarker position={currentCoords} onChange={onChange} />
        </MapContainer>
      </div>
      <Button type="button" variant={locationConfirmed ? "primary" : "secondary"} className="w-full" onClick={onToggleConfirm}>
        <Navigation className="h-4 w-4" />
        {locationConfirmed ? "Ponto confirmado" : "Confirmar este ponto no mapa"}
      </Button>
    </div>
  );
}