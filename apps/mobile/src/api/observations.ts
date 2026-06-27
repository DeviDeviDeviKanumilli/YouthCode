import { apiGet, apiPost } from './client';
import type {
  IdentificationRequest,
  IdentificationResponse,
  MediaCreatePayload,
  MediaRead,
  ObservationPipelineStatus,
  ObservationRead,
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

export function getObservation(observationId: string) {
  return apiGet<ObservationRead>(`/observations/${observationId}`);
}

export function getObservationMedia(observationId: string) {
  return apiGet<MediaRead[]>(`/observations/${observationId}/media`);
}

export function getObservationPipelineStatus(observationId: string) {
  return apiGet<ObservationPipelineStatus>(`/observations/${observationId}/pipeline-status`);
}
