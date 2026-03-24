"use client";

import { useState, useEffect, useCallback } from "react";
import { useMission } from "./use-mission";
import { useMySubmissions } from "./use-my-submissions";

export interface OperationalFocusState {
  lastTownSlug: string | null;
  lastTownName: string | null;
  lastViewedAt: string | null;
  hasSeenWelcome: boolean;
  suggestedStation?: { id: string; name: string } | null;
}

const STORAGE_KEY = "bomba-aberta:operational-focus";
const FOCUS_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useOperationalFocus() {
  const { mission, isLoaded: missionLoaded } = useMission();
  const { submissions, isLoaded: submissionsLoaded } = useMySubmissions();
  
  const [focus, setFocus] = useState<OperationalFocusState>({
    lastTownSlug: null,
    lastTownName: null,
    lastViewedAt: null,
    hasSeenWelcome: false,
    suggestedStation: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as OperationalFocusState;
        
        // Expiry check for town view
        if (parsed.lastViewedAt) {
          const age = Date.now() - new Date(parsed.lastViewedAt).getTime();
          if (age > FOCUS_EXPIRY_MS) {
            parsed.lastTownSlug = null;
            parsed.lastTownName = null;
            parsed.suggestedStation = null;
          }
        }
        
        setFocus(parsed);
      } catch (e) {
        console.error("Failed to parse operational focus", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(focus));
    }
  }, [focus, isLoaded]);

  const updateTownFocus = useCallback((slug: string, name: string) => {
    setFocus(prev => ({
      ...prev,
      lastTownSlug: slug,
      lastTownName: name,
      lastViewedAt: new Date().toISOString()
    }));
  }, []);

  const updateSuggestedStation = useCallback((station: { id: string; name: string } | null) => {
    setFocus(prev => {
      // Avoid infinite loop if same station
      if (prev.suggestedStation?.id === station?.id) return prev;
      return { ...prev, suggestedStation: station };
    });
  }, []);

  const markWelcomeSeen = useCallback(() => {
    setFocus(prev => ({ ...prev, hasSeenWelcome: true }));
  }, []);

  const pendingSubmissionsCount = submissions.filter(s => s.status === "stored").length;

  return {
    focus,
    isLoaded: isLoaded && missionLoaded && submissionsLoaded,
    mission,
    pendingSubmissionsCount,
    updateTownFocus,
    updateSuggestedStation,
    markWelcomeSeen
  };
}
