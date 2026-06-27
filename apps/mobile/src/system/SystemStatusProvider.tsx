import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { messageForError } from '@/api/client';
import { getHealth, getVersion } from '@/api/system';

type SystemStatusContextValue = {
  loading: boolean;
  ready: boolean;
  healthStatus: string;
  version: string | null;
  environment: string | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const SystemStatusContext = createContext<SystemStatusContextValue | null>(null);

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<SystemStatusContextValue, 'refresh'>>({
    loading: true,
    ready: false,
    healthStatus: 'checking',
    version: null,
    environment: null,
    error: null,
  });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const [health, version] = await Promise.all([getHealth(), getVersion()]);

      setState({
        loading: false,
        ready: true,
        healthStatus: health.status,
        version: version.version,
        environment: version.environment || health.environment,
        error: null,
      });
    } catch (err: unknown) {
      setState({
        loading: false,
        ready: true,
        healthStatus: 'unavailable',
        version: null,
        environment: null,
        error: messageForError(err, 'Unable to reach EcoSentinel API.'),
      });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <SystemStatusContext.Provider value={{ ...state, refresh }}>
      {children}
    </SystemStatusContext.Provider>
  );
}

export function useSystemStatus() {
  const context = useContext(SystemStatusContext);

  if (!context) {
    throw new Error('useSystemStatus must be used within SystemStatusProvider');
  }

  return context;
}
