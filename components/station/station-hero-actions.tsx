"use client";

import type { Route } from "next";
import { Camera, Navigation } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { openExternalNavigation } from "@/lib/navigation/external-maps";
import { trackProductEvent } from "@/lib/telemetry/client";
import type { FuelType } from "@/lib/types";

interface StationHeroActionsProps {
  sendPriceHref: Route;
  stationId: string;
  stationName: string;
  stationCity: string;
  selectedFuel: FuelType;
  lat: number;
  lng: number;
  hasValidCoordinates: boolean;
}

export function StationHeroActions({
  sendPriceHref,
  stationId,
  stationName,
  stationCity,
  selectedFuel,
  lat,
  lng,
  hasValidCoordinates
}: StationHeroActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ButtonLink
        href={sendPriceHref}
        className="w-full bg-[color:var(--color-accent)] text-black font-black h-12 text-sm italic tracking-tight"
        onClick={() => {
          void trackProductEvent({
            eventType: "camera_opened_from_station",
            pagePath: sendPriceHref,
            pageTitle: stationName,
            stationId,
            city: stationCity,
            fuelType: selectedFuel,
            payload: { source: "station-page-hero" }
          });
        }}
      >
        <Camera className="h-5 w-5" />
        ATUALIZAR PRECO AGORA
      </ButtonLink>
      {hasValidCoordinates ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            openExternalNavigation({
              lat,
              lng,
              stationId,
              stationName,
              source: "station_page"
            });
          }}
          className="w-full h-12 text-sm font-bold"
        >
          <Navigation className="h-4 w-4 text-blue-400" />
          COMO CHEGAR
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/46 font-bold text-sm">
          <Navigation className="h-4 w-4 text-white/28" />
          LOCALIZACAO EM REVISAO
        </div>
      )}
    </div>
  );
}