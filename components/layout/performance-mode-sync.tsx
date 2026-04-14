"use client";

import { useEffect, useRef } from "react";

import { trackProductEvent } from "@/lib/telemetry/client";
import { useNetworkHardening } from "@/hooks/use-network-hardening";

const emittedPerformanceModeKeys = new Set<string>();

export function PerformanceModeSync() {
  const status = useNetworkHardening();
  const hasTrackedLowPerf = useRef(false);
  const reasonsSignature = status.reasons.join("|");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.performanceMode = status.isLowPerf ? "low" : "normal";
  }, [status.isLowPerf]);

  useEffect(() => {
    if (!status.isLowPerf || hasTrackedLowPerf.current || typeof window === "undefined") {
      return;
    }

    const pagePath = window.location.pathname;
    const performanceKey = `${pagePath}::${reasonsSignature || "low-perf"}`;
    if (emittedPerformanceModeKeys.has(performanceKey)) {
      hasTrackedLowPerf.current = true;
      return;
    }

    hasTrackedLowPerf.current = true;
    emittedPerformanceModeKeys.add(performanceKey);
    void trackProductEvent({
      eventType: "performance_mode_detected",
      pagePath,
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
  }, [reasonsSignature, status.deviceMemory, status.effectiveType, status.hardwareConcurrency, status.isLowPerf, status.prefersReducedMotion, status.reasons, status.saveData]);

  return null;
}
