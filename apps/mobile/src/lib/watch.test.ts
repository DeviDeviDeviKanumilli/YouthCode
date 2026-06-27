import { describe, expect, it } from 'vitest';
import {
  actionCopy,
  confidenceCopy,
  formatUpdatedAt,
  priorityCopy,
  reportParamsForGoodPlace,
  reportParamsForWatchItem,
} from './watch';

describe('watch helpers', () => {
  it('formats valid update timestamps', () => {
    expect(formatUpdatedAt('2026-06-26T12:34:00Z')).toMatch(/Jun|Jun\.|June/);
  });

  it('falls back for invalid timestamps', () => {
    expect(formatUpdatedAt('not-a-date')).toBe('Updated recently');
  });

  it('maps priority into readable labels', () => {
    expect(priorityCopy(10)).toBe('Low signal');
    expect(priorityCopy(30)).toBe('Moderate signal');
    expect(priorityCopy(60)).toBe('High-value verification candidate');
    expect(priorityCopy(90)).toBe('Priority ecological signal');
  });

  it('maps confidence labels into readable copy', () => {
    expect(confidenceCopy('low')).toBe('Low confidence');
    expect(confidenceCopy('medium')).toBe('Medium confidence');
    expect(confidenceCopy('high')).toBe('High confidence');
  });

  it('builds watch item report params without undefined values', () => {
    expect(
      reportParamsForWatchItem({
        id: 'watch_item_123',
        speciesId: 'species-456',
        title: 'Japanese knotweed',
      }),
    ).toEqual({
      source: 'watch_item',
      watchItemId: 'watch_item_123',
      suggestedSpeciesId: 'species-456',
      suggestedSpeciesName: 'Japanese knotweed',
    });
  });

  it('builds good place report params and habitat hints', () => {
    expect(
      reportParamsForGoodPlace({
        id: 'place_123',
        type: 'creek_edges',
      }),
    ).toEqual({
      source: 'good_place',
      placeId: 'place_123',
      placeType: 'creek_edges',
      habitatHint: 'near_water',
    });
  });

  it('maps action types to readable labels', () => {
    expect(actionCopy({ label: 'Whatever', type: 'start_report_with_species' })).toBe('Report this species');
    expect(actionCopy({ label: 'Whatever', type: 'view_nearby_signals' })).toBe('View nearby signals');
  });
});

