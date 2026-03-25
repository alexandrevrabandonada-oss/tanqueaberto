"use client";

import { useState, useEffect, useCallback } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

export interface WarmSnapshot<T> {
  data: T;
  timestamp: string;
  version: string;
}

interface UseWarmStartOptions<T> {
  key: string;
  version: string;
  onRefresh?: () => Promise<T>;
}

export function useWarmStart<T>({ key, version, onRefresh }: UseWarmStartOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isWarm, setIsWarm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startTime] = useState(() => Date.now());

  // 1. Initial Load (Synchronous as possible)
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const snapshot: WarmSnapshot<T> = JSON.parse(saved);
        if (snapshot.version === version) {
          setData(snapshot.data);
          setIsWarm(true);
          
          void trackProductEvent({
            eventType: "warm_start_hit" as any,
            pagePath: window.location.pathname,
            payload: {
              key,
              ageMs: Date.now() - new Date(snapshot.timestamp).getTime(),
              ttfrMs: Date.now() - startTime
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse warm start cache", e);
      }
    } else {
      void trackProductEvent({
        eventType: "cold_start" as any,
        pagePath: window.location.pathname,
        payload: { key }
      });
    }
  }, [key, version, startTime]);

  // 2. Background Refresh
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      const liveData = await onRefresh();
      setData(liveData);
      setIsWarm(false);
      
      // Update Cache
      const snapshot: WarmSnapshot<T> = {
        data: liveData,
        timestamp: new Date().toISOString(),
        version
      };
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (e) {
      console.error("Background refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, key, version]);

  return {
    data,
    isWarm,
    isRefreshing,
    refresh,
    setData: (newData: T) => {
      setData(newData);
      const snapshot: WarmSnapshot<T> = {
        data: newData,
        timestamp: new Date().toISOString(),
        version
      };
      localStorage.setItem(key, JSON.stringify(snapshot));
    }
  };
}
