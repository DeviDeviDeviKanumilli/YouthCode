import { apiGet } from './client';
import type { ObservationAssistantContext, RegionAssistantContext } from '@/types/assistant';

export function getObservationAssistantContext(observationId: string) {
  return apiGet<ObservationAssistantContext>(`/assistant/context/observation/${observationId}`);
}

export function getRegionAssistantContext(lat: number, lon: number, radiusKm = 10) {
  return apiGet<RegionAssistantContext>(
    `/assistant/context/region?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
}
