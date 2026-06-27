import { describe, expect, it } from 'vitest';
import { backendAnswerValue, buildReportHabitatAnswers, initialHabitatType } from './reportAnswers';
import type { ReportContext } from './reportContext';

describe('report answer helpers', () => {
  it('normalizes uncertain answers to the backend habitat vocabulary', () => {
    expect(backendAnswerValue('not_sure')).toBe('unknown');
    expect(backendAnswerValue('yes')).toBe('yes');
    expect(backendAnswerValue('patch')).toBe('patch');
  });

  it('infers initial habitat type from report context', () => {
    expect(initialHabitatType({ source: 'good_place', placeType: 'creek_edges' })).toBe('wetland');
    expect(initialHabitatType({ source: 'good_place', placeType: 'street_trees' })).toBe('roadside');
    expect(initialHabitatType({ source: 'manual' })).toBe('unknown');
  });

  it('builds submission habitat answers with provenance and normalized clues', () => {
    const context: ReportContext = {
      source: 'watch_item',
      watchItemId: 'watch-1',
      suggestedSpeciesName: 'Japanese knotweed',
    };

    expect(
      buildReportHabitatAnswers(context, {
        near_water: 'not_sure',
        near_road_or_trail: 'yes',
        growth_pattern: 'patch',
        habitat_type: 'wetland',
      })
    ).toMatchObject({
      source: 'watch_item',
      watch_item_id: 'watch-1',
      suggested_species_name: 'Japanese knotweed',
      near_water: 'unknown',
      near_road_or_trail: 'yes',
      growth_pattern: 'patch',
      habitat_type: 'wetland',
    });
  });
});
