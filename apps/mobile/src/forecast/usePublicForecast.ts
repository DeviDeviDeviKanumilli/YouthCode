import { useCallback, useEffect, useState } from 'react';
import { getPublicForecast, getPublicForecastByBbox } from '@/api/forecast';
import { messageForError } from '@/api/client';
import { summarizeForecastLayers } from '@/lib/forecast';
import type { ForecastLayerSummary } from '@/types/forecast';

export function usePublicForecast(lat: number, lon: number, radiusKm: number) {
  const [summary, setSummary] = useState<ForecastLayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const collection = await getPublicForecast(lat, lon, radiusKm);
      setSummary(summarizeForecastLayers(collection));
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
    loading,
    error,
    refresh,
  };
}

export function usePublicForecastBbox(bbox: string | null) {
  const [summary, setSummary] = useState<ForecastLayerSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(bbox));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!bbox) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const collection = await getPublicForecastByBbox(bbox);
      setSummary(summarizeForecastLayers(collection));
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
    loading,
    error,
    refresh,
  };
}
