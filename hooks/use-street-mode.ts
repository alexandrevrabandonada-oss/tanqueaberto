"use client";

import { useState, useEffect, useCallback } from "react";

const STREET_MODE_KEY = "bomba-aberta:street-mode";
const RECENTS_KEY = "bomba-aberta:recent-stations";
const FAVORITES_KEY = "bomba-aberta:favorite-stations";

const MAX_RECENTS = 6;

export function useStreetMode() {
  const [isStreetMode, setIsStreetMode] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Load from local storage
  useEffect(() => {
    const savedMode = localStorage.getItem(STREET_MODE_KEY);
    const savedRecents = localStorage.getItem(RECENTS_KEY);
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);

    if (savedMode !== null) setIsStreetMode(savedMode === "true");
    if (savedRecents) setRecentIds(JSON.parse(savedRecents));
    if (savedFavorites) setFavoriteIds(JSON.parse(savedFavorites));
  }, []);

  const toggleStreetMode = useCallback(() => {
    setIsStreetMode((prev) => {
      const next = !prev;
      localStorage.setItem(STREET_MODE_KEY, String(next));
      return next;
    });
  }, []);

  const addRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((i) => i !== id);
      const next = [id, ...filtered].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  return {
    isStreetMode,
    toggleStreetMode,
    recentIds,
    addRecent,
    favoriteIds,
    toggleFavorite,
    isFavorite
  };
}
