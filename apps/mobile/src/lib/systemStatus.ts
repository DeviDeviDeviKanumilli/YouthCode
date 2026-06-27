export type SystemStatusTone = 'ok' | 'warning' | 'error';

export type SystemStatusInput = {
  loading: boolean;
  healthStatus: string;
  version: string | null;
  error: string | null;
};

export function isSystemDegraded(status: Pick<SystemStatusInput, 'loading' | 'healthStatus' | 'error'>) {
  return !status.loading && Boolean(status.error || status.healthStatus !== 'ok');
}

export function systemStatusValue(status: Pick<SystemStatusInput, 'loading' | 'healthStatus' | 'error'>) {
  if (status.loading) {
    return 'Checking';
  }

  if (status.error) {
    return 'Unavailable';
  }

  return status.healthStatus;
}

export function systemStatusDetail(status: SystemStatusInput) {
  if (status.error) {
    return status.error;
  }

  if (status.loading) {
    return 'Checking backend health and version.';
  }

  return status.version ? `Backend version ${status.version}` : 'Backend version unknown';
}

export function systemStatusTone(status: Pick<SystemStatusInput, 'loading' | 'healthStatus' | 'error'>): SystemStatusTone {
  if (status.error) {
    return 'error';
  }

  if (status.loading || status.healthStatus !== 'ok') {
    return 'warning';
  }

  return 'ok';
}
