import { describe, expect, it } from 'vitest';
import { summarizeForecastLayers } from './forecast';
import type { GeoJSONFeatureCollection } from '../types/forecast';

describe('forecast helpers', () => {
  it('summarizes public forecast layers for the mobile map', () => {
    const collection: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      metadata: {},
      features: [
        { type: 'Feature', geometry: {}, properties: { layer: 'observations' } },
        { type: 'Feature', geometry: {}, properties: { layer: 'known_records' } },
        { type: 'Feature', geometry: {}, properties: { layer: 'possible_corridors' } },
        { type: 'Feature', geometry: {}, properties: { layer: 'sampling_gap_grid' } },
        { type: 'Feature', geometry: {}, properties: { layer: 'waterways' } },
      ],
    };

    expect(summarizeForecastLayers(collection)).toEqual({
      totalFeatures: 5,
      observations: 1,
      knownRecords: 1,
      possibleCorridors: 1,
      samplingGaps: 1,
      staticContext: 1,
    });
  });
});
