import { useCallback, useEffect, useState } from 'react';
import { messageForError } from '@/api/client';
import { getSamplingGapsForArea } from '@/api/sampling';
import { summarizeSamplingGaps } from '@/lib/sampling';
import type { SamplingGapFeatureCollection } from '@/types/sampling';
import type { SamplingGapSummary } from '@/types/sampling';

export function useSamplingGaps(lat: number, lon: number, radiusKm: number) {
  const [summary, setSummary] = useState<SamplingGapSummary | null>(null);
  const [collection, setCollection] = useState<SamplingGapFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const collection = await getSamplingGapsForArea(lat, lon, radiusKm);
      setCollection(collection);
      setSummary(summarizeSamplingGaps(collection));
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load sampling gap context.'));
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    summary,
    collection,
    loading,
    error,
    refresh,
  };
}
