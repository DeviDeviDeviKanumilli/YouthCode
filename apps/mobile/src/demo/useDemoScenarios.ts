import { useCallback, useEffect, useState } from 'react';
import { messageForError } from '@/api/client';
import { getDemoScenarios } from '@/api/demo';
import type { DemoScenario } from '@/types/demo';

export function useDemoScenarios() {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDemoScenarios();
      setScenarios(data.scenarios);
      setError(null);
    } catch (err: unknown) {
      setError(messageForError(err, 'Unable to load demo scenarios.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    scenarios,
    loading,
    error,
    refresh,
  };
}
