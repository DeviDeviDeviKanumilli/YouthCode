import { describe, expect, it } from 'vitest';
import { isSystemDegraded, systemStatusDetail, systemStatusTone, systemStatusValue } from './systemStatus';

describe('system status helpers', () => {
  it('summarizes a healthy backend', () => {
    const status = {
      loading: false,
      healthStatus: 'ok',
      version: '0.1.0',
      error: null,
    };

    expect(isSystemDegraded(status)).toBe(false);
    expect(systemStatusValue(status)).toBe('ok');
    expect(systemStatusDetail(status)).toBe('Backend version 0.1.0');
    expect(systemStatusTone(status)).toBe('ok');
  });

  it('marks failed startup checks as degraded', () => {
    const status = {
      loading: false,
      healthStatus: 'unavailable',
      version: null,
      error: 'EcoSentinel could not reach the backend.',
    };

    expect(isSystemDegraded(status)).toBe(true);
    expect(systemStatusValue(status)).toBe('Unavailable');
    expect(systemStatusDetail(status)).toBe('EcoSentinel could not reach the backend.');
    expect(systemStatusTone(status)).toBe('error');
  });

  it('treats non-ok health responses as degraded warnings', () => {
    const status = {
      loading: false,
      healthStatus: 'degraded',
      version: '0.1.0',
      error: null,
    };

    expect(isSystemDegraded(status)).toBe(true);
    expect(systemStatusValue(status)).toBe('degraded');
    expect(systemStatusTone(status)).toBe('warning');
  });
});
