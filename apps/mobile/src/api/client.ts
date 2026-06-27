import { Platform } from 'react-native';

const DEFAULT_PROD_API_BASE_URL = 'https://api.ecosentinel.app';

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }
    return 'http://127.0.0.1:8000';
  }

  return DEFAULT_PROD_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly responseText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw await apiErrorFromResponse('GET', path, response);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T, Body extends object>(path: string, body: Body): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await apiErrorFromResponse('POST', path, response);
  }
  return response.json() as Promise<T>;
}

export async function apiErrorFromResponse(method: string, path: string, response: Response) {
  const text = await response.text();
  return new ApiError(
    `${method} ${path} failed with ${response.status}`,
    response.status,
    method,
    path,
    text
  );
}

export function messageForError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'This record could not be found. It may have been removed or is not available yet.';
    }
    if (error.status === 422) {
      return 'Some sighting details need another look before the backend can use them.';
    }
    if (error.status === 429) {
      return 'EcoSentinel is receiving a lot of requests. Try again in a moment.';
    }
    if (error.status >= 500) {
      return 'EcoSentinel is having trouble reaching its ecological data services right now.';
    }
    return fallback;
  }
  if (error instanceof TypeError) {
    return 'EcoSentinel could not reach the backend. Check that the API server is running and reachable from this device.';
  }
  return fallback;
}

export function resolveApiUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file:')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
