import { useCallback, useEffect, useState } from 'react';
import { messageForError } from '@/api/client';
import { getDemoScenario, getDemoScenarios } from '@/api/demo';
import type { DemoScenario } from '@/types/demo';

export function useDemoScenarios(selectedScenarioId: string | null = null) {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);

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

  const refreshSelected = useCallback(async () => {
    if (!selectedScenarioId) {
      setSelectedScenario(null);
      setSelectedError(null);
      setSelectedLoading(false);
      return;
    }

    setSelectedLoading(true);
    try {
      const scenario = await getDemoScenario(selectedScenarioId);
      setSelectedScenario(scenario);
      setSelectedError(null);
    } catch (err: unknown) {
      setSelectedScenario(null);
      setSelectedError(messageForError(err, 'Unable to load selected demo scenario.'));
    } finally {
      setSelectedLoading(false);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    void refreshSelected();
  }, [refreshSelected]);

  return {
    scenarios,
    selectedScenario,
    loading,
    selectedLoading,
    error,
    selectedError,
    refresh,
    refreshSelected,
  };
}
