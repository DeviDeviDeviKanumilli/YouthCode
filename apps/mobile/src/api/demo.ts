import { apiGet } from './client';
import type { DemoScenario, DemoScenarioList } from '@/types/demo';

export function getDemoScenarios() {
  return apiGet<DemoScenarioList>('/demo/scenarios');
}

export function getDemoScenario(id: string) {
  return apiGet<DemoScenario>(`/demo/scenarios/${id}`);
}
