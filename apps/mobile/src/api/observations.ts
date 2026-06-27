import { apiGet, apiPost } from './client';
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

export function identifyObservation(observationId: string, payload: IdentificationRequest) {
  return apiPost<IdentificationResponse, IdentificationRequest>(
    `/observations/${observationId}/identify`,
    payload
  );
}

export function getIntelligenceCard(observationId: string) {
  return apiGet<SightingIntelligenceCard>(`/observations/${observationId}/intelligence-card`);
}
