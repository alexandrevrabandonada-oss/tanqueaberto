"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

interface CityPageTelemetryProps {
  cityName: string;
  slug: string;
}

export function CityPageTelemetry({ cityName, slug }: CityPageTelemetryProps) {
  useEffect(() => {
    void trackProductEvent({
      eventType: "territorial_landing_visited" as any,
      pagePath: `/cidade/${slug}`,
      pageTitle: `Bomba Aberta - ${cityName}`,
      scopeType: "page",
      scopeId: slug,
      payload: { cityName, slug }
    });
  }, [cityName, slug]);

  return null;
}
