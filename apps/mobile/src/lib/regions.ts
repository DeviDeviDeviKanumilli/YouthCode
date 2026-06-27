import type { NearbyRegionSummary, RegionSummaryStats } from '@/types/regions';

export function summarizeNearbyRegion(region: NearbyRegionSummary): RegionSummaryStats {
  return {
    watchedSpeciesCount: region.watched_species.length,
    nearbySignalCount: region.nearby_signals.length,
    recentObservationCount: region.recent_observations.length,
  };
}
