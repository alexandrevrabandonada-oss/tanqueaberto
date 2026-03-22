"use client";

import { useEffect } from "react";

import { trackProductEvent } from "@/lib/telemetry/client";
import type { ProductTelemetryEventInput } from "@/lib/telemetry/types";

interface ProductEventProps extends ProductTelemetryEventInput {}

export function ProductEvent({ eventType, pagePath, pageTitle, stationId, city, fuelType, scopeType, scopeId, reason, payload }: ProductEventProps) {
  useEffect(() => {
    void trackProductEvent({
      eventType,
      pagePath,
      pageTitle,
      stationId,
      city,
      fuelType,
      scopeType,
      scopeId,
      reason,
      payload
    });
  }, [city, eventType, fuelType, pagePath, pageTitle, payload, reason, scopeId, scopeType, stationId]);

  return null;
}

