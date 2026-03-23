"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { StationWithReports } from "@/lib/types";
import type { FuelFilter } from "@/lib/filters/public";

const StationMap = dynamic(() => import("@/components/map/station-map").then((mod) => mod.StationMap), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-[28px] bg-white/6" />
});

interface StationMapShellProps {
  stations: StationWithReports[];
  className?: string;
  returnToHref?: string;
  fuelFilter?: FuelFilter;
}

export function StationMapShell({ stations, className, returnToHref, fuelFilter = "all" }: StationMapShellProps) {
  return (
    <div className={cn("w-full", className)}>
      <StationMap stations={stations} className={className} returnToHref={returnToHref} fuelFilter={fuelFilter} />
    </div>
  );
}
