export type WatchActionType = string;

export interface WatchAction {
  label: string;
  type: WatchActionType;
}

export interface WatchRegion {
  label: string;
  radiusKm: number;
}

export interface WatchEvidence {
  recentObservationCount?: number | null;
  nearestObservationMeters?: number | null;
  nearbyKnownRecordCount?: number | null;
  currentMonthRelevant?: boolean | null;
  habitatMatches?: string[] | null;
  sourceNames: string[];
}

export interface WatchMapOverlay {
  type: 'corridor' | 'area' | 'point' | 'boundary' | 'records' | 'habitat';
  geometryGeoJson?: Record<string, unknown> | null;
  pointsGeoJson?: Record<string, unknown> | null;
}

export interface WatchLocationContext {
  centerLat?: number | null;
  centerLon?: number | null;
  radiusMeters?: number | null;
  geometryGeoJson?: Record<string, unknown> | null;
}

export interface GoodPlaceEvidence {
  nearestFeatureMeters?: number | null;
  samplingLabel?: string | null;
  relevantSpeciesIds?: string[] | null;
  sourceNames: string[];
}

export type WatchItemType =
  | 'species_watch'
  | 'seasonal_watch'
  | 'habitat_watch'
  | 'tree_health'
  | 'aquatic_watch';

export type GoodPlaceType =
  | 'creek_edges'
  | 'trail_entrances'
  | 'park_boundaries'
  | 'street_trees'
  | 'wetland_edges'
  | 'garden_edges';

export type ConfidenceLabel = 'low' | 'medium' | 'high';

export interface WatchItem {
  id: string;
  type: WatchItemType;
  label: string;
  title: string;
  summary: string;
  chips: string[];
  speciesId?: string | null;
  priority: number;
  confidenceLabel: ConfidenceLabel;
  evidence: WatchEvidence;
  imageUrl?: string | null;
  imageAlt?: string | null;
  nextAction: WatchAction;
}

export interface GoodPlaceToCheck {
  id: string;
  type: GoodPlaceType;
  title: string;
  summary: string;
  chips: string[];
  priority: number;
  imageUrl?: string | null;
  imageAlt?: string | null;
  locationContext: WatchLocationContext;
  mapOverlay?: WatchMapOverlay | null;
  evidence: GoodPlaceEvidence;
  nextAction: WatchAction;
}

export interface WatchEmptyState {
  title: string;
  message: string;
  actionLabel?: string | null;
}

export interface WatchScreenResponse {
  region: WatchRegion;
  updatedAt: string;
  watchedNearYou: WatchItem[];
  goodPlacesToCheck: GoodPlaceToCheck[];
  emptyState?: WatchEmptyState | null;
}

export interface WatchItemLocalContext {
  summary: string;
  recentObservationCount?: number | null;
  nearestObservationMeters?: number | null;
  confidenceLabel: ConfidenceLabel;
}

export interface WatchItemDetail {
  id: string;
  title: string;
  label: string;
  speciesId?: string | null;
  imageUrl?: string | null;
  explanation: string;
  whatToLookFor: string[];
  whereToLook: string[];
  photoTips: string[];
  lookalikeNotes: string[];
  localContext: WatchItemLocalContext;
  uncertaintyNotice: string;
  mapOverlay?: WatchMapOverlay | null;
  actions: WatchAction[];
}

export interface GoodPlaceDetail {
  id: string;
  type: string;
  title: string;
  summary: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  whyItMatters: string;
  whatToLookFor: string[];
  usefulPhotoTips: string[];
  relevantWatchItems: WatchItem[];
  uncertaintyNotice: string;
  mapOverlay: WatchMapOverlay;
  actions: WatchAction[];
}
