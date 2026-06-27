import { useCallback, useEffect, useState } from 'react';
import { getSamplingGapsForArea } from '@/api/sampling';
import { summarizeSamplingGaps } from '@/lib/sampling';
import type { SamplingGapSummary } from '@/types/sampling';

export function useSamplingGaps(lat: number, lon: number, radiusKm: number) {
  const [summary, setSummary] = useState<SamplingGapSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const collection = await getSamplingGapsForArea(lat, lon, radiusKm);
      setSummary(summarizeSamplingGaps(collection));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sampling gap context.');
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
