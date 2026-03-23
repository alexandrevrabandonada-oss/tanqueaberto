import { trackProductEvent } from "@/lib/telemetry/client";

export type MapApp = "waze" | "google" | "apple";

export interface ExternalNavigationOptions {
  lat: number;
  lng: number;
  stationId?: string;
  stationName?: string;
  source?: string;
}

export function getNavigationUrl(app: MapApp, lat: number, lng: number): string {
  switch (app) {
    case "waze":
      return `waze://?ll=${lat},${lng}&navigate=yes`;
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    case "apple":
      return `maps://?daddr=${lat},${lng}`;
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
}

export function openExternalNavigation(app: MapApp, options: ExternalNavigationOptions) {
  const url = getNavigationUrl(app, options.lat, options.lng);
  
  // Track handoff
  void trackProductEvent({
    eventType: "external_navigation_opened",
    pagePath: window.location.pathname,
    pageTitle: document.title,
    stationId: options.stationId || null,
    scopeType: "navigation",
    scopeId: options.stationId || null,
    payload: {
      app,
      source: options.source || "station_card",
      stationName: options.stationName,
      lat: options.lat,
      lng: options.lng
    }
  });

  // Guardar contexto para o retorno
  const handoffData = {
    stationId: options.stationId,
    stationName: options.stationName,
    timestamp: Date.now(),
    source: options.source
  };
  localStorage.setItem("bomba-aberta:navigation-handoff", JSON.stringify(handoffData));

  // Abrir link
  window.open(url, "_blank");
}

export function getNavigationHandoff() {
  const raw = localStorage.getItem("bomba-aberta:navigation-handoff");
  if (!raw) return null;
  
  try {
    const data = JSON.parse(raw);
    // Expirar após 2 horas
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
