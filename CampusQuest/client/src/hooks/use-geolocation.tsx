import { useState, useEffect, useRef, useCallback } from "react";
import type { Coordinates } from "@shared/schema";

export function useGeolocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Handler for geolocation updates
  const positionUpdateHandler = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setError(null);
    setIsTracking(true);
  }, []);

  // Error handler
  const errorHandler = useCallback((err: GeolocationPositionError) => {
    setError(`Location error: ${err.message}`);
    setIsTracking(false);
  }, []);

  // Get initial position with high accuracy immediately
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // First get a quick initial position
    navigator.geolocation.getCurrentPosition(
      positionUpdateHandler,
      errorHandler,
      { 
        enableHighAccuracy: false, 
        timeout: 2000,
        maximumAge: 60000 // Accept any recent position initially
      }
    );

    // Then start watching with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      positionUpdateHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 0, // Never use cached positions for the watch
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [positionUpdateHandler, errorHandler]);

  return { location, error, isTracking };
}

export function calculateDistance(coord1: Coordinates, coord2: Coordinates) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
