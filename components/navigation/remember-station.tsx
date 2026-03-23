"use client";

import { useEffect } from "react";

import { rememberStationVisit } from "@/lib/navigation/home-context";

interface RememberStationVisitProps {
  stationId: string;
  stationName: string;
  city: string;
}

export function RememberStationVisit({ stationId, stationName, city }: RememberStationVisitProps) {
  useEffect(() => {
    rememberStationVisit({ id: stationId, name: stationName, city });
  }, [city, stationId, stationName]);

  return null;
}
