import { describe, expect, it } from 'vitest';
import { buildRawNoteFromContext, buildReportContext, placeTypeLabel, sourceLabel } from './reportContext';

describe('report context helpers', () => {
  it('normalizes Watch item route params for display and payload provenance', () => {
    const context = buildReportContext({
      source: 'watch_item',
      watchItemId: 'watch-1',
      suggestedSpeciesId: 'species-1',
      suggestedSpeciesName: 'Japanese knotweed',
    });

    expect(context).toEqual({
      source: 'watch_item',
      watchItemId: 'watch-1',
      suggestedSpeciesId: 'species-1',
      suggestedSpeciesName: 'Japanese knotweed',
      placeId: undefined,
      placeType: undefined,
      habitatHint: undefined,
      observationId: undefined,
    });
    expect(buildRawNoteFromContext(context)).toBe(
      'Mobile report opened from watch_item for Japanese knotweed.'
    );
  });

  it('normalizes Good Place route params and labels habitat hints', () => {
    const context = buildReportContext({
      source: 'good_place',
      placeId: ['place-1'],
      placeType: 'creek_edges',
      habitatHint: 'near_water',
    });

    expect(context.placeId).toBe('place-1');
    expect(context.placeType).toBe('creek_edges');
    expect(placeTypeLabel(context.placeType!)).toBe('creek edges');
    expect(buildRawNoteFromContext(context)).toBe(
      'Mobile report opened from good_place for creek edges.'
    );
  });

  it('keeps follow-up observation context visible', () => {
    const context = buildReportContext({
      source: 'sighting_history',
      observationId: '12345678-aaaa-bbbb-cccc-123456789abc',
    });

    expect(context.observationId).toBe('12345678-aaaa-bbbb-cccc-123456789abc');
    expect(sourceLabel(context.source)).toBe('Sighting history');
  });
});
