"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";
import {
  applyLocalSessionActivity,
  clearCurrentLocalSession,
  createInitialLocalSessionState,
  deriveLocalSessionNextStep,
  getLocalSessionMode,
  getOrCreateLocalDeviceId,
  isLocalSessionExpired,
  persistCurrentLocalSession,
  persistLastLocalSessionSummary,
  persistLocalSessionHistory,
  settleExpiredLocalSession,
  summarizeLocalSession,
  type LocalSessionGestureType,
  type LocalSessionMode,
  type LocalSessionNextStep,
  type LocalSessionSnapshot,
  type LocalSessionSummary,
} from "@/lib/session/local-session";

export type StreetSession = LocalSessionSnapshot;
export type SessionSummary = LocalSessionSummary;

const SESSION_HISTORY_LIMIT = 12;

export function useStreetSession() {
  const [session, setSession] = useState<StreetSession | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [deviceId, setDeviceId] = useState<string>("serverless");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const sessionRef = useRef<StreetSession | null>(null);
  const historyRef = useRef<SessionSummary[]>([]);
  const lastSummaryRef = useRef<SessionSummary | null>(null);

  useEffect(() => {
    const initial = createInitialLocalSessionState();
    const current = initial.current;
    const historySnapshot = initial.history;
    const summarySnapshot = initial.lastSummary;

    if (current && isLocalSessionExpired(current)) {
      const settled = settleExpiredLocalSession(current, historySnapshot, "timeout");
      setSession(settled.current);
      setHistory(settled.history);
      setLastSummary(settled.summary ?? summarySnapshot);
      sessionRef.current = settled.current;
      historyRef.current = settled.history;
      lastSummaryRef.current = settled.summary ?? summarySnapshot;
      persistCurrentLocalSession(null);
      persistLocalSessionHistory(settled.history);
      if (settled.summary) {
        persistLastLocalSessionSummary(settled.summary);
      }
    } else {
      setSession(current);
      setHistory(historySnapshot);
      setLastSummary(summarySnapshot);
      sessionRef.current = current;
      historyRef.current = historySnapshot;
      lastSummaryRef.current = summarySnapshot;
    }

    setDeviceId(initial.deviceId);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    persistCurrentLocalSession(session);
    sessionRef.current = session;
  }, [isLoaded, session]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const normalized = history.slice(0, SESSION_HISTORY_LIMIT);
    historyRef.current = normalized;
    persistLocalSessionHistory(normalized);
  }, [history, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    lastSummaryRef.current = lastSummary;
    persistLastLocalSessionSummary(lastSummary);
  }, [isLoaded, lastSummary]);

  const finalizeSession = useCallback((snapshot: StreetSession, endReason: "manual" | "timeout" = "manual") => {
    const summary = summarizeLocalSession(snapshot, endReason);
    const nextHistory = [summary, ...historyRef.current.filter((entry) => entry.id !== summary.id)].slice(0, SESSION_HISTORY_LIMIT);

    setSession(null);
    setHistory(nextHistory);
    setLastSummary(summary);
    sessionRef.current = null;
    historyRef.current = nextHistory;
    lastSummaryRef.current = summary;
    persistCurrentLocalSession(null);
    persistLocalSessionHistory(nextHistory);
    persistLastLocalSessionSummary(summary);

    if (endReason === "manual") {
      setShowDebrief(true);
    }

    void trackProductEvent({
      eventType: "street_session_completed" as any,
      pagePath: window.location.pathname,
      payload: {
        ...summary,
        inactivity_close: endReason === "timeout",
        manual_close: endReason === "manual"
      }
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !session) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = sessionRef.current;
      if (current && isLocalSessionExpired(current)) {
        finalizeSession(current, "timeout");
      }
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [finalizeSession, isLoaded, session]);

  const closeSessionManual = useCallback(() => {
    if (sessionRef.current) {
      finalizeSession(sessionRef.current, "manual");
    }
  }, [finalizeSession]);

  const clearDebrief = useCallback(() => {
    setShowDebrief(false);
  }, []);

  const recordActivity = useCallback((type: LocalSessionGestureType, stationId?: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const now = new Date().toISOString();
    const resolvedDeviceId = deviceId !== "serverless" ? deviceId : getOrCreateLocalDeviceId();
    if (deviceId === "serverless") {
      setDeviceId(resolvedDeviceId);
    }
    let current = sessionRef.current;

    if (!current || isLocalSessionExpired(current)) {
      if (current) {
        finalizeSession(current, "timeout");
      }

      current = {
        id: crypto.randomUUID(),
        deviceId: resolvedDeviceId,
        startTime: now,
        lastActivity: now,
        stationsSeen: [],
        stationsTouched: [],
        enviosIniciados: 0,
        enviosConcluidos: 0,
        lastGesture: null
      };

      void trackProductEvent({
        eventType: "street_session_started" as any,
        pagePath: window.location.pathname,
        payload: { sessionId: current.id, trigger: type, deviceId: resolvedDeviceId }
      });
    }

    const next = applyLocalSessionActivity(current, type, stationId, now);
    sessionRef.current = next;
    setSession(next);
  }, [deviceId, finalizeSession]);

  const sessionMode = useMemo<LocalSessionMode>(() => getLocalSessionMode(session, history), [history, session]);
  const nextStep = useMemo<LocalSessionNextStep>(() => deriveLocalSessionNextStep(session), [session]);
  const lastGesture = session?.lastGesture ?? lastSummary?.lastGesture ?? null;

  return {
    deviceId,
    session,
    sessionId: session?.id ?? null,
    sessionMode,
    history,
    historyCount: history.length,
    lastSummary,
    lastGesture,
    nextStep,
    showDebrief,
    stationsSeenCount: session?.stationsSeen.length ?? 0,
    stationsTouchedCount: session?.stationsTouched.length ?? 0,
    isActive: !!session,
    recordActivity,
    closeSessionManual,
    clearDebrief,
    isLoaded
  };
}

