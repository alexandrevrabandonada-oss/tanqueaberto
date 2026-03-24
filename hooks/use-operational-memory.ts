"use client";

import { useState, useEffect, useCallback } from "react";

export interface MemoryStation {
  id: string;
  name: string;
  timestamp: string;
}

export interface MemoryCut {
  type: 'city' | 'group';
  id: string;
  name: string;
  timestamp: string;
}

export interface OperationalMemoryState {
  recentStations: MemoryStation[];
  recentCuts: MemoryCut[];
  pinnedStations: string[];
  pinnedCuts: string[]; // Concatenated type:id
}

const STORAGE_KEY = "bomba-aberta:operational-memory";
const MEMORY_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours for recents
const MAX_RECENTS = 6;

export function useOperationalMemory() {
  const [memory, setMemory] = useState<OperationalMemoryState>({
    recentStations: [],
    recentCuts: [],
    pinnedStations: [],
    pinnedCuts: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as OperationalMemoryState;
        
        // Expiry check for recents
        const now = Date.now();
        parsed.recentStations = (parsed.recentStations || []).filter(s => 
          now - new Date(s.timestamp).getTime() < MEMORY_EXPIRY_MS
        );
        parsed.recentCuts = (parsed.recentCuts || []).filter(c => 
          now - new Date(c.timestamp).getTime() < MEMORY_EXPIRY_MS
        );
        
        setMemory(parsed);
      } catch (e) {
        console.error("Failed to parse operational memory", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    }
  }, [memory, isLoaded]);

  const addRecentStation = useCallback((station: { id: string; name: string }) => {
    setMemory(prev => {
      const filtered = prev.recentStations.filter(s => s.id !== station.id);
      const next = [
        { ...station, timestamp: new Date().toISOString() },
        ...filtered
      ].slice(0, MAX_RECENTS);
      return { ...prev, recentStations: next };
    });
  }, []);

  const addRecentCut = useCallback((cut: { type: 'city' | 'group'; id: string; name: string }) => {
    setMemory(prev => {
      const filtered = prev.recentCuts.filter(c => c.id !== cut.id);
      const next = [
        { ...cut, timestamp: new Date().toISOString() },
        ...filtered
      ].slice(0, MAX_RECENTS);
      return { ...prev, recentCuts: next };
    });
  }, []);

  const togglePinStation = useCallback((id: string) => {
    setMemory(prev => {
      const isPinned = prev.pinnedStations.includes(id);
      const next = isPinned 
        ? prev.pinnedStations.filter(i => i !== id) 
        : [...prev.pinnedStations, id];
      return { ...prev, pinnedStations: next };
    });
  }, []);

  const togglePinCut = useCallback((type: 'city' | 'group', id: string) => {
    const key = `${type}:${id}`;
    setMemory(prev => {
      const isPinned = prev.pinnedCuts.includes(key);
      const next = isPinned 
        ? prev.pinnedCuts.filter(i => i !== key) 
        : [...prev.pinnedCuts, key];
      return { ...prev, pinnedCuts: next };
    });
  }, []);

  return {
    memory,
    isLoaded,
    addRecentStation,
    addRecentCut,
    togglePinStation,
    togglePinCut,
    isStationPinned: (id: string) => memory.pinnedStations.includes(id),
    isCutPinned: (type: 'city' | 'group', id: string) => memory.pinnedCuts.includes(`${type}:${id}`),
  };
}
