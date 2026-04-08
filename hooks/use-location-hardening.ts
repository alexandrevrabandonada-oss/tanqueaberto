"use client";

import { useCallback, useSyncExternalStore } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";
import { calculateDistance } from "@/lib/geo/distance";

export type LocationTrustStatus = "confiável" | "provável" | "incerto";

export interface HardenedLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  trustStatus: LocationTrustStatus;
}

interface HardenedLocationState {
  location: HardenedLocation | null;
  error: string | null;
  loading: boolean;
}

const sharedState: {
  current: HardenedLocationState;
  watchId: number | null;
  listeners: Set<() => void>;
  lastValidLocation: HardenedLocation | null;
} = {
  current: {
    location: null,
    error: null,
    loading: false
  },
  watchId: null,
  listeners: new Set(),
  lastValidLocation: null
};

const MOVEMENT_UPDATE_THRESHOLD_METERS = 6;

function hasGeolocationSupport() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

function getTrustStatus(accuracy: number): LocationTrustStatus {
  if (accuracy < 25) return "confiável";
  if (accuracy < 100) return "provável";
  return "incerto";
}

function emitChange() {
  sharedState.listeners.forEach((listener) => listener());
}

function setSharedState(next: Partial<HardenedLocationState>) {
  sharedState.current = {
    ...sharedState.current,
    ...next
  };
  emitChange();
}

function shouldKeepPoint(next: HardenedLocation) {
  const previous = sharedState.lastValidLocation;
  if (!previous) {
    return true;
  }

  const movementMeters = calculateDistance(previous.lat, previous.lng, next.lat, next.lng);
  const timeDiffSeconds = Math.max(0, (next.timestamp - previous.timestamp) / 1000);

  if (movementMeters < MOVEMENT_UPDATE_THRESHOLD_METERS && timeDiffSeconds < 4 && Math.abs(next.accuracy - previous.accuracy) < 10) {
    return false;
  }

  if (timeDiffSeconds > 0) {
    const jumpSpeedKmh = (movementMeters / timeDiffSeconds) * 3.6;
    if (jumpSpeedKmh > 150 && previous.trustStatus === "confiável") {
      void trackProductEvent({
        eventType: "geofencing_jump_discarded" as any,
        pagePath: window.location.pathname,
        payload: { jumpSpeedKmh, accuracy: next.accuracy, distMeters: movementMeters }
      });
      return false;
    }
  }

  return true;
}

function acceptLocation(position: GeolocationPosition) {
  const { latitude, longitude, accuracy, speed } = position.coords;
  const timestamp = position.timestamp;
  const trustStatus = getTrustStatus(accuracy);

  const nextLocation: HardenedLocation = {
    lat: latitude,
    lng: longitude,
    accuracy,
    timestamp,
    speed: speed ?? null,
    trustStatus
  };

  if (!shouldKeepPoint(nextLocation)) {
    return;
  }

  sharedState.lastValidLocation = nextLocation;
  setSharedState({
    location: nextLocation,
    error: null,
    loading: false
  });
}

function handleError(err: GeolocationPositionError) {
  let message = "Não foi possível ler sua localização.";

  if (err.code === err.PERMISSION_DENIED) {
    message = "Você preferiu não usar sua localização.";
  } else if (err.code === err.POSITION_UNAVAILABLE) {
    message = "Sua localização não apareceu agora.";
  } else if (err.code === err.TIMEOUT) {
    message = "A localização demorou demais para responder.";
  }

  if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
    setSharedState({ location: sharedState.lastValidLocation, error: message, loading: false });
  } else {
    setSharedState({ error: message, loading: false });
  }

  if (err.code === err.PERMISSION_DENIED) {
    stopWatch();
  }

  void trackProductEvent({
    eventType: "geolocation_error",
    pagePath: window.location.pathname,
    payload: { code: err.code, message }
  });
}

function startWatch() {
  if (sharedState.watchId !== null || !hasGeolocationSupport()) {
    return;
  }

  setSharedState({ loading: true, error: null });

  sharedState.watchId = navigator.geolocation.watchPosition(
    acceptLocation,
    handleError,
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 1000
    }
  );
}

function stopWatch() {
  if (sharedState.watchId === null || !hasGeolocationSupport()) {
    return;
  }

  navigator.geolocation.clearWatch(sharedState.watchId);
  sharedState.watchId = null;
}

function requestImmediateFix() {
  if (!hasGeolocationSupport()) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    acceptLocation,
    handleError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 500
    }
  );
}

function subscribe(listener: () => void) {
  sharedState.listeners.add(listener);
  startWatch();

  return () => {
    sharedState.listeners.delete(listener);
    if (sharedState.listeners.size === 0) {
      stopWatch();
    }
  };
}

function getSnapshot() {
  return sharedState.current;
}

export function useLocationHardening() {
  const { location, loading, error } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refresh = useCallback(() => {
    if (!hasGeolocationSupport()) {
      setSharedState({
        error: "Geolocalização não suportada",
        loading: false
      });
      return;
    }

    stopWatch();
    setSharedState({ loading: true, error: null });
    requestImmediateFix();
    startWatch();
  }, []);

  return {
    location,
    loading,
    error,
    refresh
  };
}
