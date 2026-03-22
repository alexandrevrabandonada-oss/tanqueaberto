"use client";

import dynamic from "next/dynamic";

const StationMap = dynamic(() => import("@/components/map/station-map").then((mod) => mod.StationMap), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse bg-white/6" />
});

export function StationMapShell() {
  return <StationMap />;
}
