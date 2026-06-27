import type { DemoScenario } from '@/types/demo';

export type DemoScenarioSummary = {
  possibleSpecies: string;
  signalLabel: string;
  verificationStatus: string;
  mapLayerCount: number;
  passingAssertionCount: number;
  assertionCount: number;
  firstStep: string;
  bbox: string | null;
};

export function summarizeDemoScenario(scenario: DemoScenario): DemoScenarioSummary {
  const assertions = Object.values(scenario.assertions);

  return {
    possibleSpecies: scenario.observed_outputs.possible_species ?? 'Possible species pending',
    signalLabel: formatToken(scenario.observed_outputs.signal_label ?? 'insufficient_evidence'),
    verificationStatus: formatToken(scenario.observed_outputs.verification_status),
    mapLayerCount: scenario.observed_outputs.map_layers.length,
    passingAssertionCount: assertions.filter(Boolean).length,
    assertionCount: assertions.length,
    firstStep: scenario.script_steps[0] ?? 'Open the demo scenario.',
    bbox: scenario.map_query.bbox ?? null,
  };
}

export function selectedDemoScenario(
  scenarios: DemoScenario[],
  selectedScenarioId: string | null,
  detailedScenario: DemoScenario | null
) {
  if (!selectedScenarioId) {
    return null;
  }

  if (detailedScenario?.id === selectedScenarioId) {
    return detailedScenario;
  }

  return scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
}

export function formatToken(value: string) {
  return value.replaceAll('_', ' ');
}
