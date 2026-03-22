"use client";

import dynamic from "next/dynamic";
import type { StationWithReports } from "@/lib/types";

const StationMap = dynamic(() => import("@/components/map/station-map").then((mod) => mod.StationMap), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse bg-white/6" />
});

interface StationMapShellProps {
  stations: StationWithReports[];
}

export function StationMapShell({ stations }: StationMapShellProps) {
  return <StationMap stations={stations} />;
}
