import { apiGet } from './client';
import type { ObservationAssistantContext } from '@/types/assistant';

export function getObservationAssistantContext(observationId: string) {
  return apiGet<ObservationAssistantContext>(`/assistant/context/observation/${observationId}`);
}
