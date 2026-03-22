"use client";

import type { ProductTelemetryEventInput } from "@/lib/telemetry/types";

function canSend() {
  return typeof window !== "undefined";
}

export async function trackProductEvent(input: ProductTelemetryEventInput) {
  if (!canSend()) {
    return;
  }

  const body = JSON.stringify({
    ...input,
    payload: {
      pagePath: input.pagePath,
      pageTitle: input.pageTitle ?? null,
      ...input.payload
    }
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/telemetry", blob);
    return;
  }

  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
      keepalive: true
    });
  } catch {
    // Telemetry must never block UX.
  }
}

