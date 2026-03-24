"use client";

const ATTRIBUTION_KEY = "ba_last_hub_interaction";
const CONVERSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export function recordHubInteraction() {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
    timestamp: Date.now(),
    source: "hub"
  }));
}

export function consumeHubAttribution(): boolean {
  if (typeof window === "undefined") return false;
  
  const raw = localStorage.getItem(ATTRIBUTION_KEY);
  if (!raw) return false;
  
  try {
    const data = JSON.parse(raw);
    const isValid = (Date.now() - data.timestamp) < CONVERSION_WINDOW_MS;
    
    // Clear after check (only one conversion per interaction)
    localStorage.removeItem(ATTRIBUTION_KEY);
    
    return isValid;
  } catch {
    return false;
  }
}
