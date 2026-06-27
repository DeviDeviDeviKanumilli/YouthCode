export type RegionMapPoint = {
  observation_id: string;
  latitude: number;
  longitude: number;
  possible_species?: string | null;
  signal_label?: string | null;
  verification_status: string;
  observed_at: string;
};

export type NearbySignalSummary = {
  observation_id: string;
  signal_label?: string | null;
  possible_species?: string | null;
  verification_status: string;
};

export type NearbyRegionSummary = {
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  region_summary: string;
  nearby_signals: NearbySignalSummary[];
  watched_species: string[];
  under_sampled_note: string;
  recent_observations: RegionMapPoint[];
  simple_map_points: RegionMapPoint[];
  uncertainty_notice: string;
};

export type RegionSummaryStats = {
  watchedSpeciesCount: number;
  nearbySignalCount: number;
  recentObservationCount: number;
};
