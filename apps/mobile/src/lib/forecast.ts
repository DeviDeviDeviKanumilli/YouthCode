import type { ForecastLayerSummary, GeoJSONFeatureCollection } from '@/types/forecast';

const OBSERVATION_LAYERS = new Set(['observations', 'observation']);
const KNOWN_RECORD_LAYERS = new Set(['known_records', 'known_record']);
const CORRIDOR_LAYERS = new Set(['possible_corridors', 'possible_corridor', 'corridor']);
const SAMPLING_GAP_LAYERS = new Set(['sampling_gap_grid', 'sampling_gap']);
const STATIC_CONTEXT_LAYERS = new Set(['waterways', 'roads_trails', 'parks']);

export function summarizeForecastLayers(collection: GeoJSONFeatureCollection): ForecastLayerSummary {
  const summary: ForecastLayerSummary = {
    totalFeatures: collection.features.length,
    observations: 0,
    knownRecords: 0,
    possibleCorridors: 0,
    samplingGaps: 0,
    staticContext: 0,
  };

  for (const feature of collection.features) {
    const layer = String(feature.properties.layer ?? feature.properties.feature_type ?? '');
    if (OBSERVATION_LAYERS.has(layer)) {
      summary.observations += 1;
    } else if (KNOWN_RECORD_LAYERS.has(layer)) {
      summary.knownRecords += 1;
    } else if (CORRIDOR_LAYERS.has(layer)) {
      summary.possibleCorridors += 1;
    } else if (SAMPLING_GAP_LAYERS.has(layer)) {
      summary.samplingGaps += 1;
    } else if (STATIC_CONTEXT_LAYERS.has(layer)) {
      summary.staticContext += 1;
    }
  }

  return summary;
}
