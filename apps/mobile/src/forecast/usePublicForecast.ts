import { useCallback, useEffect, useState } from 'react';
import { getPublicForecast, getPublicForecastByBbox } from '@/api/forecast';
import { messageForError } from '@/api/client';
import { summarizeForecastLayers } from '@/lib/forecast';
import {
  boundsFromBbox,
  boundsFromCenter,
  extractForecastMapMarkers,
  type ForecastMapMarker,
} from '@/lib/forecastMap';
import type { ForecastLayerSummary } from '@/types/forecast';

export function usePublicForecast(lat: number, lon: number, radiusKm: number) {
  const [summary, setSummary] = useState<ForecastLayerSummary | null>(null);
  const [markers, setMarkers] = useState<ForecastMapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const collection = await getPublicForecast(lat, lon, radiusKm);
      const bounds = boundsFromCenter(lat, lon, radiusKm);
      setSummary(summarizeForecastLayers(collection));
      setMarkers(extractForecastMapMarkers(collection, bounds));
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load forecast map layer.'));
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    summary,
    markers,
    loading,
    error,
    refresh,
  };
}

export function usePublicForecastBbox(bbox: string | null) {
  const [summary, setSummary] = useState<ForecastLayerSummary | null>(null);
  const [markers, setMarkers] = useState<ForecastMapMarker[]>([]);
  const [loading, setLoading] = useState(Boolean(bbox));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!bbox) {
      setSummary(null);
      setMarkers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const collection = await getPublicForecastByBbox(bbox);
      const bounds = boundsFromBbox(bbox);
      setSummary(summarizeForecastLayers(collection));
      setMarkers(bounds ? extractForecastMapMarkers(collection, bounds) : []);
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load demo forecast map layer.'));
    } finally {
      setLoading(false);
    }
  }, [bbox]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    summary,
    markers,
    loading,
    error,
    refresh,
  };
}
