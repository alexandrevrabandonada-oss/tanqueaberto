"use client";

import { useState, useCallback } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

interface GeolocationState {
  coords: {
    lat: number;
    lng: number;
  } | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  errorCode: "unsupported" | "denied" | "unavailable" | "timeout" | "unknown" | null;
  permissionStatus: PermissionState | null;
}

function canUseTelemetry() {
  return typeof window !== "undefined";
}

function classifyGeoState(accuracy: number | null, errorCode: GeolocationState["errorCode"]) {
  if (errorCode && errorCode !== null) {
    return "unavailable" as const;
  }

  if (accuracy === null) {
    return "unavailable" as const;
  }

  if (accuracy <= 100) {
    return "reliable" as const;
  }

  return "imprecise" as const;
}

function emitGeoState(state: ReturnType<typeof classifyGeoState>, accuracy: number | null, errorCode: GeolocationState["errorCode"]) {
  if (!canUseTelemetry()) {
    return;
  }

  void trackProductEvent({
    eventType: "station_geo_state_reported",
    pagePath: window.location.pathname,
    pageTitle: document.title,
    payload: {
      state,
      accuracy,
      errorCode: errorCode ?? null
    }
  });
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    accuracy: null,
    loading: false,
    error: null,
    errorCode: null,
    permissionStatus: null,
  });

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Este aparelho não mostra sua localização.", errorCode: "unsupported" }));
      emitGeoState("unavailable", null, "unsupported");
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null, errorCode: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const accuracy = position.coords.accuracy ?? null;
        const geoState = classifyGeoState(accuracy, null);
        setState({
          coords,
          accuracy,
          loading: false,
          error: null,
          errorCode: null,
          permissionStatus: "granted",
        });
        emitGeoState(geoState, accuracy, null);
        
        void trackProductEvent({
          eventType: "geolocation_granted",
          pagePath: window.location.pathname,
          pageTitle: document.title,
          payload: { ...coords }
        });
      },
      (error) => {
        let errorMessage = "Não deu para saber onde você está agora.";
        let errorCode: GeolocationState["errorCode"] = "unknown";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Você preferiu não usar sua localização.";
          errorCode = "denied";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Sua localização não apareceu agora.";
          errorCode = "unavailable";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "A localização demorou demais para responder.";
          errorCode = "timeout";
        }

        setState({
          coords: null,
          accuracy: null,
          loading: false,
          error: errorMessage,
          errorCode,
          permissionStatus: error.code === error.PERMISSION_DENIED ? "denied" : "prompt",
        });
        emitGeoState("unavailable", null, errorCode);

        void trackProductEvent({
          eventType: "geolocation_error",
          pagePath: window.location.pathname,
          pageTitle: document.title,
          payload: { error: errorMessage, code: error.code }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  return { ...state, getLocation };
}
