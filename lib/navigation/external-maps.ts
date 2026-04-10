import { trackProductEvent } from "@/lib/telemetry/client";

export interface ExternalNavigationOptions {
  lat: number;
  lng: number;
  stationId?: string;
  stationName?: string;
  source?: string;
}

export function getGoogleMapsNavigationUrl(lat: number, lng: number): string {
  const destination = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving&dir_action=navigate`;
}

export function openExternalNavigation(options: ExternalNavigationOptions) {
  const url = getGoogleMapsNavigationUrl(options.lat, options.lng);

  void trackProductEvent({
    eventType: "external_navigation_opened",
    pagePath: window.location.pathname,
    pageTitle: document.title,
    stationId: options.stationId || null,
    scopeType: "navigation",
    scopeId: options.stationId || null,
    payload: {
      app: "google_maps",
      source: options.source || "station_card",
      stationName: options.stationName,
      lat: options.lat,
      lng: options.lng
    }
  });

  const handoffData = {
    stationId: options.stationId,
    stationName: options.stationName,
    timestamp: Date.now(),
    source: options.source
  };
  localStorage.setItem("bomba-aberta:navigation-handoff", JSON.stringify(handoffData));

  window.location.href = url;
}

export function getNavigationHandoff() {
  const raw = localStorage.getItem("bomba-aberta:navigation-handoff");
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > 2 * 60 * 60 * 1000) {
      localStorage.removeItem("bomba-aberta:navigation-handoff");
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearNavigationHandoff() {
  localStorage.removeItem("bomba-aberta:navigation-handoff");
}
