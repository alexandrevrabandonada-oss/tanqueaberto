"use client";

import { useEffect, useRef } from "react";

import { trackProductEvent } from "@/lib/telemetry/client";
import { useNetworkHardening } from "@/hooks/use-network-hardening";

export function PerformanceModeSync() {
  const status = useNetworkHardening();
  const hasTrackedLowPerf = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.performanceMode = status.isLowPerf ? "low" : "normal";
  }, [status.isLowPerf]);

  useEffect(() => {
    if (!status.isLowPerf || hasTrackedLowPerf.current || typeof window === "undefined") {
      return;
    }

    hasTrackedLowPerf.current = true;
    void trackProductEvent({
      eventType: "performance_mode_detected",
      pagePath: window.location.pathname,
      pageTitle: document.title,
      payload: {
        effectiveType: status.effectiveType,
        saveData: status.saveData,
        deviceMemory: status.deviceMemory,
        hardwareConcurrency: status.hardwareConcurrency,
        prefersReducedMotion: status.prefersReducedMotion,
        reasons: status.reasons,
        isLowPerf: status.isLowPerf
      }
    });
  }, [status]);

  return null;
}