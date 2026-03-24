"use client";

import { useEffect } from "react";

import { rememberStationVisit } from "@/lib/navigation/home-context";
import { useOperationalMemory } from "@/hooks/use-operational-memory";

interface RememberStationVisitProps {
  stationId: string;
  stationName: string;
  city: string;
}

export function RememberStationVisit({ stationId, stationName, city }: RememberStationVisitProps) {
  const { addRecentStation } = useOperationalMemory();
  
  useEffect(() => {
    rememberStationVisit({ id: stationId, name: stationName, city });
    addRecentStation({ id: stationId, name: stationName });
  }, [city, stationId, stationName, addRecentStation]);

  return null;
}
