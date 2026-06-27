import { describe, expect, it } from 'vitest';
import { summarizeNearbyRegion } from './regions';
import type { NearbyRegionSummary } from '@/types/regions';

describe('region helpers', () => {
  it('summarizes nearby region counts for Explore', () => {
    const region: NearbyRegionSummary = {
      center_latitude: 40.714,
      center_longitude: -74.006,
      radius_km: 10,
      region_summary: '2 nearby observations are available, but data is sparse.',
      nearby_signals: [
        {
          observation_id: 'obs-1',
          signal_label: 'High-value verification candidate',
          possible_species: 'Japanese knotweed',
          verification_status: 'raw',
        },
      ],
      watched_species: ['Japanese knotweed', 'Spotted lanternfly'],
      under_sampled_note: 'This area may be under-sampled.',
      recent_observations: [
        {
          observation_id: 'obs-1',
          latitude: 40.714,
          longitude: -74.006,
          possible_species: 'Japanese knotweed',
          signal_label: 'High-value verification candidate',
          verification_status: 'raw',
          observed_at: '2026-06-27T12:00:00Z',
        },
      ],
      simple_map_points: [],
      uncertainty_notice: 'Sparse data: absence of observations should not be treated as species absence.',
    };

    expect(summarizeNearbyRegion(region)).toEqual({
      watchedSpeciesCount: 2,
      nearbySignalCount: 1,
      recentObservationCount: 1,
    });
  });
});
