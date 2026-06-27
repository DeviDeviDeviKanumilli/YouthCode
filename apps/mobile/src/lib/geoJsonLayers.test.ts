import { describe, expect, it } from 'vitest';
import { parseGeoJsonLayers, regionForCoordinate } from './geoJsonLayers';
import type { GeoJSONFeatureCollection } from '../types/forecast';

describe('geoJsonLayers', () => {
  it('parses points, lines, and polygons from forecast collections', () => {
    const collection: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      metadata: {},
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-74.006, 40.714] },
          properties: { layer: 'observations', observation_id: 'obs-1' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-74.01, 40.71],
              [-74.0, 40.72],
            ],
          },
          properties: { layer: 'possible_corridors' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-74.02, 40.7],
                [-74.0, 40.7],
                [-74.0, 40.72],
                [-74.02, 40.72],
                [-74.02, 40.7],
              ],
            ],
          },
          properties: { layer: 'sampling_gap_grid' },
        },
      ],
    };

    const parsed = parseGeoJsonLayers([collection]);
    expect(parsed.points).toHaveLength(1);
    expect(parsed.points[0]?.observationId).toBe('obs-1');
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.polygons).toHaveLength(1);
  });

  it('builds map regions from center and radius', () => {
    const region = regionForCoordinate(40.714, -74.006, 5);
    expect(region.latitude).toBe(40.714);
    expect(region.longitude).toBe(-74.006);
    expect(region.latitudeDelta).toBeGreaterThan(0);
    expect(region.longitudeDelta).toBeGreaterThan(0);
  });
});
