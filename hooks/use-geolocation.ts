"use client";

import { useState, useCallback } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

interface GeolocationState {
  coords: {
    lat: number;
    lng: number;
  } | null;
  loading: boolean;
  error: string | null;
  permissionStatus: PermissionState | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
    permissionStatus: null,
  });

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocalização não suportada pelo navegador" }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setState({
          coords,
          loading: false,
          error: null,
          permissionStatus: "granted",
        });
        
        void trackProductEvent({
          eventType: "geolocation_granted",
          pagePath: window.location.pathname,
          pageTitle: document.title,
          payload: { ...coords }
        });
      },
      (error) => {
        let errorMessage = "Erro ao obter localização";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Permissão negada para acessar localização";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Localização indisponível";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Tempo esgotado para obter localização";
        }

        setState({
          coords: null,
          loading: false,
          error: errorMessage,
          permissionStatus: error.code === error.PERMISSION_DENIED ? "denied" : "prompt",
        });

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
