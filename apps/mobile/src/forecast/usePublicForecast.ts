import { useCallback, useEffect, useState } from 'react';
import { getPublicForecast } from '@/api/forecast';
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
      setError(err instanceof Error ? err.message : 'Unable to load forecast map layer.');
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
