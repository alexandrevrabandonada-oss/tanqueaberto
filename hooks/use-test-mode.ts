"use client";

import { useCallback, useEffect, useState } from "react";
import { useProgressiveIdentity } from "@/hooks/use-progressive-identity";
import { trackProductEvent } from "@/lib/telemetry/client";

export interface TestModeState {
  isActive: boolean;
  isTester: boolean;
  showDebugLogs: boolean;
  lastFeedbackAt?: string;
}

export function useTestMode() {
  const identity = useProgressiveIdentity();
  const [state, setState] = useState<TestModeState>({
    isActive: false,
    isTester: false,
    showDebugLogs: false
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!identity.isLoaded) return;

    setState((prev) => ({
      ...prev,
      isTester: identity.isTester,
      isActive: identity.isTester ? true : prev.isActive
    }));
    setIsLoaded(true);
  }, [identity.isLoaded, identity.isTester]);

  const toggleTestMode = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  const reportBug = useCallback(async (description: string, severity: 'low' | 'high' = 'low') => {
    if (!state.isActive) return;

    await trackProductEvent({
      eventType: "beta_test_feedback" as any,
      pagePath: window.location.pathname,
      payload: {
        description,
        severity,
        isTestMode: true,
        timestamp: new Date().toISOString()
      }
    });

    setState((prev) => ({ ...prev, lastFeedbackAt: new Date().toISOString() }));
  }, [state.isActive]);

  return {
    ...state,
    isLoaded,
    toggleTestMode,
    reportBug
  };
}
