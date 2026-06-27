import { API_BASE_URL, apiGet, apiPost } from './client';
import type {
  IdentificationRequest,
  IdentificationResponse,
  MediaCreatePayload,
  MediaRead,
  ObservationCreatePayload,
  ObservationCreateResponse,
  SightingIntelligenceCard,
} from '@/types/report';

export function createObservation(payload: ObservationCreatePayload) {
  return apiPost<ObservationCreateResponse, ObservationCreatePayload>('/observations', payload);
}

export function createObservationMedia(observationId: string, payload: MediaCreatePayload) {
  return apiPost<MediaRead, MediaCreatePayload>(`/observations/${observationId}/media`, payload);
}

export async function uploadObservationMedia(observationId: string, photoUri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri: photoUri,
    name: 'ecosentinel-sighting.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/observations/${observationId}/media/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST /observations/${observationId}/media/upload failed: ${response.status} ${text}`);
  }
  return response.json() as Promise<MediaRead>;
}

export function identifyObservation(observationId: string, payload: IdentificationRequest) {
  return apiPost<IdentificationResponse, IdentificationRequest>(
    `/observations/${observationId}/identify`,
    payload
  );
}

export function getIntelligenceCard(observationId: string) {
  return apiGet<SightingIntelligenceCard>(`/observations/${observationId}/intelligence-card`);
}
