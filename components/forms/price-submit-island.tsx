"use client";

import dynamic from "next/dynamic";

import { SectionCard } from "@/components/ui/section-card";
import type { FuelType, StationWithReports } from "@/lib/types";

const PriceSubmitForm = dynamic(() => import("@/components/forms/price-submit-form").then((mod) => mod.PriceSubmitForm), {
  ssr: false,
  loading: () => (
    <SectionCard className="space-y-3 border-white/10 bg-white/5">
      <div className="h-8 w-40 rounded-full bg-white/8" />
      <div className="h-72 rounded-[20px] bg-white/5" />
    </SectionCard>
  )
});

interface PriceSubmitIslandProps {
  stations: StationWithReports[];
  initialStationId?: string;
  initialFuelType?: FuelType;
  returnToHref?: string;
  draftKeyOverride?: string;
}

export function PriceSubmitIsland(props: PriceSubmitIslandProps) {
  return <PriceSubmitForm {...props} />;
}
