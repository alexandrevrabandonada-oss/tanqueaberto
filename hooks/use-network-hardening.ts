"use client";

import { useEffect, useState } from "react";

export interface NetworkStatus {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  saveData: boolean;
  isLowPerf: boolean;
}

export function useNetworkHardening() {
  const [status, setStatus] = useState<NetworkStatus>({
    effectiveType: 'unknown',
    saveData: false,
    isLowPerf: false
  });

  useEffect(() => {
    const conn = (navigator as any).connection;
    
    function updateStatus() {
      if (!conn) return;

      const isLowPerf = conn.effectiveType.includes('2g') || 
                        conn.saveData || 
                        conn.rtt > 500; // Latency threshold

      setStatus({
        effectiveType: conn.effectiveType,
        saveData: conn.saveData,
        isLowPerf
      });

      // Apply low-perf-mode class to body for global CSS reactivity
      if (typeof document !== 'undefined') {
        if (isLowPerf) {
          document.body.classList.add('low-perf-mode');
        } else {
          document.body.classList.remove('low-perf-mode');
        }
      }
    }

    if (conn) {
      updateStatus();
      conn.addEventListener('change', updateStatus);
      return () => conn.removeEventListener('change', updateStatus);
    }
  }, []);

  return status;
}
