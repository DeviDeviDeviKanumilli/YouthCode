import { useCallback, useEffect, useState } from 'react';
import { getNearbyRegion } from '@/api/regions';
import { messageForError } from '@/api/client';
import type { NearbyRegionSummary } from '@/types/regions';

export function useNearbyRegion(lat: number, lon: number, radiusKm: number) {
  const [region, setRegion] = useState<NearbyRegionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNearbyRegion(lat, lon, radiusKm);
      setRegion(data);
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load nearby region context.'));
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    region,
    loading,
    error,
    refresh,
  };
}
