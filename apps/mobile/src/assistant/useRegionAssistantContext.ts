import { useCallback, useEffect, useState } from 'react';
import { getRegionAssistantContext } from '@/api/assistant';
import { messageForError } from '@/api/client';
import type { RegionAssistantContext } from '@/types/assistant';

export function useRegionAssistantContext(lat: number, lon: number, radiusKm: number) {
  const [context, setContext] = useState<RegionAssistantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRegionAssistantContext(lat, lon, radiusKm);
      setContext(data);
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load grounded area context.'));
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    context,
    loading,
    error,
    refresh,
  };
}
