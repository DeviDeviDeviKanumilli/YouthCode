import { describe, expect, it } from 'vitest';
import {
  boundsFromBbox,
  boundsFromCenter,
  extractForecastMapMarkers,
} from './forecastMap';
import type { GeoJSONFeatureCollection } from '../types/forecast';

describe('forecast map helpers', () => {
  it('builds bounds from center and radius', () => {
    const bounds = boundsFromCenter(40.714, -74.006, 5);
    expect(bounds.minLat).toBeLessThan(40.714);
    expect(bounds.maxLat).toBeGreaterThan(40.714);
    expect(bounds.minLon).toBeLessThan(-74.006);
    expect(bounds.maxLon).toBeGreaterThan(-74.006);
  });

  it('parses bbox strings', () => {
    expect(boundsFromBbox('-74.03,40.69,-73.98,40.75')).toEqual({
      minLon: -74.03,
      minLat: 40.69,
      maxLon: -73.98,
      maxLat: 40.75,
    });
  });

  it('projects point features into map marker positions', () => {
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
          geometry: { type: 'Point', coordinates: [-74.01, 40.72] },
          properties: { layer: 'known_records' },
        },
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[-74.01, 40.71], [-74.0, 40.72]] },
          properties: { layer: 'possible_corridors' },
        },
      ],
    };

    const markers = extractForecastMapMarkers(collection, boundsFromCenter(40.714, -74.006, 5));
    expect(markers).toHaveLength(2);
    expect(markers[0]?.tone).toBe('observation');
    expect(markers[1]?.tone).toBe('known_record');
    expect(markers[0]?.xPercent).toBeGreaterThan(0);
    expect(markers[0]?.yPercent).toBeGreaterThan(0);
  });
});
