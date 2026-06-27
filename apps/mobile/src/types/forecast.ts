export type GeoJSONFeature = {
  type: 'Feature';
  geometry: Record<string, unknown>;
  properties: Record<string, unknown>;
};

export type GeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata: Record<string, unknown>;
};

export type ForecastLayerSummary = {
  totalFeatures: number;
  observations: number;
  knownRecords: number;
  possibleCorridors: number;
  samplingGaps: number;
  staticContext: number;
};
