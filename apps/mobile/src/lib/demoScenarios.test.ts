import { describe, expect, it } from 'vitest';
import { summarizeDemoScenario } from './demoScenarios';
import type { DemoScenario } from '@/types/demo';

describe('demo scenario helpers', () => {
  it('summarizes approved scenario outputs for the mobile demo deck', () => {
    const scenario: DemoScenario = {
      id: 'student_knotweed_near_creek',
      title: 'Student uploads possible Japanese knotweed near creek',
      persona: 'student',
      script_steps: ['Open the public map around Demo Creek.'],
      seeded_observation_id: 'obs-1',
      map_query: { bbox: '-74.03,40.69,-73.98,40.75' },
      expected_outputs: { corridor_type: 'waterway' },
      observed_outputs: {
        possible_species: 'Japanese knotweed',
        confidence_label: 'medium_high',
        signal_label: 'high_value_verification_candidate',
        verification_status: 'needs_review',
        sampling_label: 'under_sampled',
        final_signal_priority: '66.00',
        sampling_gap_value: '75.00',
        map_layers: ['observations', 'possible_corridors', 'waterways'],
        corridor_type: 'waterway',
      },
      assertions: {
        near_waterway: true,
        signal_label: true,
        corridor_type: false,
      },
      deterministic: true,
    };

    expect(summarizeDemoScenario(scenario)).toEqual({
      possibleSpecies: 'Japanese knotweed',
      signalLabel: 'high value verification candidate',
      verificationStatus: 'needs review',
      mapLayerCount: 3,
      passingAssertionCount: 2,
      assertionCount: 3,
      firstStep: 'Open the public map around Demo Creek.',
      bbox: '-74.03,40.69,-73.98,40.75',
    });
  });
});
