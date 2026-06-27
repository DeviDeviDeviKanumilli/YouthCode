import { describe, expect, it } from 'vitest';
import { intelligenceCardTitle, signalPriorityDisplay } from './intelligenceCard';
import type { SightingIntelligenceCard } from '@/types/report';

describe('intelligence card helpers', () => {
  it('prefers common name, then scientific name, for saved sighting titles', () => {
    const base = {
      observation_id: 'obs-1',
      possible_species: null,
      local_status: '',
      known_nearby_records_summary: '',
      habitat_match_summary: '',
      pathway_summary: '',
      sampling_value_summary: '',
      verification_status: 'raw',
      plain_language_explanation: '',
      uncertainty_notice: '',
      data_sources_used: [],
    } satisfies SightingIntelligenceCard;

    expect(intelligenceCardTitle(base)).toBe('Sighting intelligence');
    expect(
      intelligenceCardTitle({
        ...base,
        possible_species: { scientific_name: 'Fallopia japonica' },
      })
    ).toBe('Fallopia japonica');
    expect(
      intelligenceCardTitle({
        ...base,
        possible_species: { common_name: 'Japanese knotweed', scientific_name: 'Fallopia japonica' },
      })
    ).toBe('Japanese knotweed');
  });

  it('formats missing signal priority as insufficient evidence', () => {
    expect(signalPriorityDisplay({ signal_priority: 72.4 })).toBe('72');
    expect(signalPriorityDisplay({ signal_priority: null })).toBe('Insufficient evidence');
  });
});
