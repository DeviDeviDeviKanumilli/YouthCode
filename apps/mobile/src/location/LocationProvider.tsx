import * as Location from 'expo-location';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type LocalCoordinates = {
  lat: number;
  lon: number;
};

type LocalAreaState = {
  coords: LocalCoordinates | null;
  label: string;
  locationGranted: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DEFAULT_RADIUS_KM = 5;

export const FALLBACK_COORDS: LocalCoordinates = {
  lat: 40.714,
  lon: -74.006,
};

export const FALLBACK_RADIUS_KM = DEFAULT_RADIUS_KM;

const LocalAreaContext = createContext<LocalAreaState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<LocalCoordinates | null>(null);
  const [label, setLabel] = useState('Finding local area');
  const [locationGranted, setLocationGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const location = await Location.requestForegroundPermissionsAsync();
      if (location.status !== 'granted') {
        setLocationGranted(false);
        setCoords(null);
        setLabel('Location permission needed');
        setError('Location permission was not granted.');
        return;
      }

      setLocationGranted(true);
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoords = {
        lat: current.coords.latitude,
        lon: current.coords.longitude,
      };
      setCoords(nextCoords);

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: nextCoords.lat,
          longitude: nextCoords.lon,
        });
        setLabel(formatPlaceLabel(place) ?? 'Current area');
      } catch {
        setLabel('Current area');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to read device location.';
      setError(message);
      setLabel('Current area');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      coords,
      label,
      locationGranted,
      loading,
      error,
      refresh,
    }),
    [coords, error, label, loading, locationGranted, refresh]
  );

  return <LocalAreaContext.Provider value={value}>{children}</LocalAreaContext.Provider>;
}

export function useLocalArea() {
  const value = useContext(LocalAreaContext);
  if (!value) {
    throw new Error('useLocalArea must be used inside LocationProvider');
  }
  return value;
}

export function useBackendCoordinates() {
  const area = useLocalArea();
  return area.coords ?? FALLBACK_COORDS;
}

function formatPlaceLabel(place: Location.LocationGeocodedAddress | undefined) {
  if (!place) {
    return null;
  }

  const city = place.city ?? place.district ?? place.subregion;
  const region = place.region ?? place.country;

  if (city && region) {
    return `${city}, ${region}`;
  }
  return city ?? region ?? place.name ?? null;
}
