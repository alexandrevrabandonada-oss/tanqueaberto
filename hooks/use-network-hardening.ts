"use client";

import { useEffect, useState } from "react";

export interface NetworkStatus {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  saveData: boolean;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  prefersReducedMotion: boolean;
  isLowPerf: boolean;
  reasons: string[];
}

function readConnectionState() {
  if (typeof navigator === "undefined") {
    return {
      effectiveType: 'unknown' as const,
      saveData: false,
      downlink: null as number | null,
      rtt: null as number | null
    };
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number } }).connection;

  return {
    effectiveType: (connection?.effectiveType as NetworkStatus['effectiveType']) ?? 'unknown',
    saveData: Boolean(connection?.saveData),
    downlink: typeof connection?.downlink === 'number' ? connection.downlink : null,
    rtt: typeof connection?.rtt === 'number' ? connection.rtt : null
  };
}

function readDeviceState() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      deviceMemory: null as number | null,
      hardwareConcurrency: null as number | null,
      prefersReducedMotion: false
    };
  }

  const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  return {
    deviceMemory: typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null : null,
    hardwareConcurrency: typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null,
    prefersReducedMotion: Boolean(motionQuery?.matches)
  };
}

function evaluateLowPerf() {
  const connection = readConnectionState();
  const device = readDeviceState();
  const reasons: string[] = [];

  if (connection.saveData) reasons.push("save-data");
  if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") reasons.push(connection.effectiveType);
  if (connection.effectiveType === "3g") reasons.push("3g");
  if (typeof connection.downlink === "number" && connection.downlink < 1.5) reasons.push("downlink-low");
  if (typeof connection.rtt === "number" && connection.rtt > 500) reasons.push("rtt-high");
  if (typeof device.deviceMemory === "number" && device.deviceMemory <= 4) reasons.push(`memory-${device.deviceMemory}`);
  if (typeof device.hardwareConcurrency === "number" && device.hardwareConcurrency <= 4) reasons.push(`cpu-${device.hardwareConcurrency}`);
  if (device.prefersReducedMotion) reasons.push("reduced-motion");

  return {
    ...connection,
    ...device,
    isLowPerf: reasons.length > 0,
    reasons
  } satisfies NetworkStatus;
}

export function useNetworkHardening() {
  const [status, setStatus] = useState<NetworkStatus>(() => evaluateLowPerf());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refresh = () => {
      const next = evaluateLowPerf();
      setStatus(next);
      document.body.classList.toggle("low-perf-mode", next.isLowPerf);
    };

    refresh();

    const connection = (navigator as Navigator & { connection?: EventTarget | null }).connection;
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    connection?.addEventListener?.("change", refresh as EventListener);
    motionQuery?.addEventListener?.("change", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);

    return () => {
      connection?.removeEventListener?.("change", refresh as EventListener);
      motionQuery?.removeEventListener?.("change", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  return status;
}
