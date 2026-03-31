"use client";

import { useEffect, useState } from "react";

import { MissionOverlay } from "@/components/mission/mission-overlay";

type IdleBrowserWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleDeferredRuntime(onReady: () => void) {
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

  if (typeof browserWindow.requestIdleCallback === "function") {
    idleId = browserWindow.requestIdleCallback(() => finish(), { timeout: 1000 });
  } else {
    timeoutId = globalThis.setTimeout(() => finish(), 220);
  }

  return () => {
    browserWindow.removeEventListener("pointerdown", onFirstInput);
    browserWindow.removeEventListener("keydown", onFirstInput);
    if (idleId && typeof browserWindow.cancelIdleCallback === "function") {
      browserWindow.cancelIdleCallback(idleId);
    }
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  };
}

export function RouteRuntimeSignals() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => scheduleDeferredRuntime(() => setIsReady(true)), []);

  if (!isReady) {
    return null;
  }

  return <MissionOverlay />;
}
