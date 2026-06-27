import { API_BASE_URL, apiErrorFromResponse, apiGet, apiPost } from './client';
import type {
  IdentificationRequest,
  IdentificationResponse,
  MediaCreatePayload,
  MediaRead,
  ObservationCreatePayload,
  ObservationCreateResponse,
  PipelineStatusResponse,
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
    throw await apiErrorFromResponse(
      'POST',
      `/observations/${observationId}/media/upload`,
      response
    );
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

export function getPipelineStatus(observationId: string) {
  return apiGet<PipelineStatusResponse>(`/observations/${observationId}/pipeline-status`);
}
