"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

const SESSION_STORAGE_KEY = "bomba-aberta:street-session";
const SUMMARY_STORAGE_KEY = "bomba-aberta:last-session-summary";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity to close session

export interface StreetSession {
  id: string;
  startTime: string;
  lastActivity: string;
  stationsSeen: string[];
  stationsTouched: string[];
  enviosIniciados: number;
  enviosConcluidos: number;
}

export interface SessionSummary {
  id: string;
  date: string;
  stationsSeenCount: number;
  stationsTouchedCount: number;
  gapsFilledCount: number;
  durationMs: number;
  completedAt: string;
}

export function useStreetSession() {
  const [session, setSession] = useState<StreetSession | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const sessionRef = useRef<StreetSession | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    const savedSummary = localStorage.getItem(SUMMARY_STORAGE_KEY);

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as StreetSession;
        // Check if session has expired
        if (Date.now() - new Date(parsed.lastActivity).getTime() > SESSION_TIMEOUT_MS) {
          // Close it silently on load if old
          finalizeSession(parsed);
        } else {
          setSession(parsed);
          sessionRef.current = parsed;
        }
      } catch (e) {
        console.error("Failed to parse street session", e);
      }
    }

    if (savedSummary) {
      try {
        setLastSummary(JSON.parse(savedSummary));
      } catch (e) {
        console.error("Failed to parse session summary", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Persist session
  useEffect(() => {
    if (isLoaded) {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, [session, isLoaded]);

  function finalizeSession(s: StreetSession) {
    const summary: SessionSummary = {
      id: s.id,
      date: new Date(s.startTime).toLocaleDateString(),
      stationsSeenCount: s.stationsSeen.length,
      stationsTouchedCount: s.stationsTouched.length,
      gapsFilledCount: s.enviosConcluidos,
      durationMs: new Date(s.lastActivity).getTime() - new Date(s.startTime).getTime(),
      completedAt: new Date().toISOString()
    };

    setLastSummary(summary);
    localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summary));
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    sessionRef.current = null;

    void trackProductEvent({
      eventType: "street_session_completed" as any,
      pagePath: window.location.pathname,
      payload: { 
        ...summary,
        inactivity_close: true
      }
    });
  }

  const recordActivity = useCallback((type: 'view' | 'touch' | 'start' | 'complete', stationId?: string) => {
    setSession(prev => {
      let current = prev;
      const now = new Date().toISOString();

      // Start new session if none or expired
      if (!current || (Date.now() - new Date(current.lastActivity).getTime() > SESSION_TIMEOUT_MS)) {
        if (current) finalizeSession(current);
        
        current = {
          id: crypto.randomUUID(),
          startTime: now,
          lastActivity: now,
          stationsSeen: [],
          stationsTouched: [],
          enviosIniciados: 0,
          enviosConcluidos: 0
        };

        void trackProductEvent({
          eventType: "street_session_started" as any,
          pagePath: window.location.pathname,
          payload: { sessionId: current.id, trigger: type }
        });
      }

      const next = { ...current, lastActivity: now };

      if (type === 'view' && stationId && !next.stationsSeen.includes(stationId)) {
        next.stationsSeen = [...next.stationsSeen, stationId];
      } else if (type === 'touch' && stationId && !next.stationsTouched.includes(stationId)) {
        next.stationsTouched = [...next.stationsTouched, stationId];
      } else if (type === 'start') {
        next.enviosIniciados += 1;
      } else if (type === 'complete') {
        next.enviosConcluidos += 1;
      }

      sessionRef.current = next;
      return next;
    });
  }, []);

  return {
    session,
    lastSummary,
    stationsSeenCount: session?.stationsSeen.length ?? 0,
    stationsTouchedCount: session?.stationsTouched.length ?? 0,
    isActive: !!session,
    recordActivity,
    isLoaded
  };
}
