"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export function useLocationHardening() {
  const [location, setLocation] = useState<HardenedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const lastValidLocation = useRef<HardenedLocation | null>(null);
  const watchId = useRef<number | null>(null);

  const getTrustStatus = (accuracy: number): LocationTrustStatus => {
    if (accuracy < 25) return "confiável";
    if (accuracy < 100) return "provável";
    return "incerto";
  };

  const onLocationUpdate = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const timestamp = position.timestamp;
    
    const currentTrust = getTrustStatus(accuracy);
    
    // Jump Filter: If we have a previous point, check if the speed of the jump is realistic
    if (lastValidLocation.current) {
      const dist = calculateDistance(
        lastValidLocation.current.lat,
        lastValidLocation.current.lng,
        latitude,
        longitude
      ) * 1000; // in meters
      
      const timeDiff = (timestamp - lastValidLocation.current.timestamp) / 1000; // in seconds
      
      if (timeDiff > 0) {
        const jumpSpeed = (dist / timeDiff) * 3.6; // in km/h
        
        // If the jump is > 150km/h and we were reliable before, ignore this point as a glitch
        if (jumpSpeed > 150 && lastValidLocation.current.trustStatus === "confiável") {
          void trackProductEvent({
            eventType: "geofencing_jump_discarded" as any,
            pagePath: window.location.pathname,
            payload: { jumpSpeed, accuracy, dist }
          });
          return;
        }
      }
    }

    const newLocation: HardenedLocation = {
      lat: latitude,
      lng: longitude,
      accuracy,
      timestamp,
      speed: speed ?? null,
      trustStatus: currentTrust
    };

    lastValidLocation.current = newLocation;
    setLocation(newLocation);
    setLoading(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada");
      return;
    }

    setLoading(true);

    watchId.current = navigator.geolocation.watchPosition(
      onLocationUpdate,
      (err) => {
        setError(err.message);
        setLoading(false);
        void trackProductEvent({
          eventType: "geolocation_error",
          pagePath: window.location.pathname,
          payload: { code: err.code, message: err.message }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      }
    );
  }, [onLocationUpdate]);

  useEffect(() => {
    startTracking();
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [startTracking]);

  return {
    location,
    loading,
    error,
    refresh: startTracking
  };
}
