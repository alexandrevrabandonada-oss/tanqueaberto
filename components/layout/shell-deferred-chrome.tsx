"use client";

import { useEffect, useState } from "react";

import { PerformanceModeSync } from "@/components/layout/performance-mode-sync";
import { PwaStatusStrip } from "@/components/pwa/pwa-status-strip";
import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";

type IdleBrowserWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleDeferredChrome(onReady: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const browserWindow = window as IdleBrowserWindow;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let idleId = 0;
  let resolved = false;

  const finish = () => {
    if (resolved) {
      return;
    }
    resolved = true;
    onReady();
  };

  const onFirstInput = () => finish();

  browserWindow.addEventListener("pointerdown", onFirstInput, { once: true, passive: true });
  browserWindow.addEventListener("keydown", onFirstInput, { once: true });
  browserWindow.addEventListener("touchstart", onFirstInput, { once: true, passive: true });

  if (typeof browserWindow.requestIdleCallback === "function") {
    idleId = browserWindow.requestIdleCallback(() => finish(), { timeout: 900 });
  } else {
    timeoutId = globalThis.setTimeout(() => finish(), 180);
  }

  return () => {
    browserWindow.removeEventListener("pointerdown", onFirstInput);
    browserWindow.removeEventListener("keydown", onFirstInput);
    browserWindow.removeEventListener("touchstart", onFirstInput);
    if (idleId && typeof browserWindow.cancelIdleCallback === "function") {
      browserWindow.cancelIdleCallback(idleId);
    }
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  };
}

export function ShellDeferredChrome({ killSwitches }: { killSwitches?: Partial<OperationalKillSwitches> }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => scheduleDeferredChrome(() => setIsReady(true)), []);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <PerformanceModeSync />
      <PwaStatusStrip killSwitches={killSwitches} />
    </>
  );
}
