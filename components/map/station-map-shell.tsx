"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { StationWithReports } from "@/lib/types";
import type { FuelFilter } from "@/lib/filters/public";
import { useNetworkHardening } from "@/hooks/use-network-hardening";
import { trackProductEvent } from "@/lib/telemetry/client";

const StationMap = dynamic(() => import("@/components/map/station-map").then((mod) => mod.StationMap), {
  ssr: false,
  loading: () => <div className={cn("w-full rounded-[28px] bg-white/6", "h-[280px]")} />
});

interface StationMapShellProps {
  stations: StationWithReports[];
  className?: string;
  returnToHref?: string;
  fuelFilter?: FuelFilter;
  center?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number; accuracy: number; trustStatus: "confiável" | "provável" | "incerto"; speed: number | null } | null;
  compact?: boolean;
}

export function StationMapShell({ stations, className, returnToHref, fuelFilter = "all", center, userLocation, compact = false }: StationMapShellProps) {
  const status = useNetworkHardening();
  const [shouldMountMap, setShouldMountMap] = useState(() => !status.isLowPerf);
  const mountStartedAt = useRef<number>(Date.now());
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!status.isLowPerf) {
      setShouldMountMap(true);
      return;
    }

    const idle = window.requestIdleCallback?.(() => setShouldMountMap(true), { timeout: 1200 });
    const timer = window.setTimeout(() => setShouldMountMap(true), 1200);

    return () => {
      if (typeof idle === "number") {
        window.cancelIdleCallback?.(idle);
      }
      window.clearTimeout(timer);
    };
  }, [status.isLowPerf]);

  useEffect(() => {
    if (!status.isLowPerf || !shouldMountMap || reportedRef.current) {
      return;
    }

    reportedRef.current = true;
    void trackProductEvent({
      eventType: "low_perf_map_mounted",
      pagePath: window.location.pathname,
      pageTitle: document.title,
      payload: {
        delayMs: Date.now() - mountStartedAt.current,
        effectiveType: status.effectiveType,
        reasons: status.reasons,
        stationsCount: stations.length,
        fuelFilter,
        returnToHref: returnToHref ?? null
      }
    });
  }, [status.effectiveType, status.isLowPerf, status.reasons, shouldMountMap, stations.length, fuelFilter, returnToHref]);

  if (status.isLowPerf && !shouldMountMap) {
    return (
      <div className={cn("grid w-full place-items-center rounded-[28px] border border-white/8 bg-black/24 px-5 text-center text-sm text-white/56", compact ? "h-[200px]" : "h-[260px]", className)}>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Mapa leve carregando.</p>
          <p>A lista entra primeiro para não travar o aparelho.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <StationMap stations={stations} className={className} returnToHref={returnToHref} fuelFilter={fuelFilter} center={center} userLocation={userLocation} compact={compact} />
    </div>
  );
}




