"use client";

import { useEffect, useState, useCallback } from "react";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { getUtilityStatusAction } from "@/app/actions/user";
import { trackProductEvent } from "@/lib/telemetry/client";

export interface TestModeState {
  isActive: boolean;
  isTester: boolean;
  showDebugLogs: boolean;
  lastFeedbackAt?: string;
}

export function useTestMode() {
  const { reporterNickname } = useMySubmissions();
  const [state, setState] = useState<TestModeState>({
    isActive: false,
    isTester: false,
    showDebugLogs: false
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function checkTesterStatus() {
      if (!reporterNickname) return;
      
      const result = await getUtilityStatusAction(reporterNickname, null);
      if (result && result.trust.isTester) {
        setState(prev => ({ 
          ...prev, 
          isTester: true, 
          isActive: true // Active by default for testers
        }));
      }
      setIsLoaded(true);
    }
    
    checkTesterStatus();
  }, [reporterNickname]);

  const toggleTestMode = useCallback(() => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }));
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

    setState(prev => ({ ...prev, lastFeedbackAt: new Date().toISOString() }));
  }, [state.isActive]);

  return {
    ...state,
    isLoaded,
    toggleTestMode,
    reportBug
  };
}
