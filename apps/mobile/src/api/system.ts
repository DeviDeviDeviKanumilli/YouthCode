import { apiGet } from './client';

export type HealthResponse = {
  status: string;
  service: string;
  environment: string;
};

export type VersionResponse = {
  service: string;
  version: string;
  environment: string;
};

export function getHealth() {
  return apiGet<HealthResponse>('/health');
}

export function getVersion() {
  return apiGet<VersionResponse>('/version');
}
