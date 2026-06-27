import type { GeoJSONFeature, GeoJSONFeatureCollection } from '@/types/forecast';

export type ForecastMapMarker = {
  id: string;
  xPercent: number;
  yPercent: number;
  tone: 'observation' | 'known_record' | 'corridor' | 'sampling_gap' | 'context';
};

export type MapBounds = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

const OBSERVATION_LAYERS = new Set(['observations', 'observation']);
const KNOWN_RECORD_LAYERS = new Set(['known_records', 'known_record', 'verified_records']);
const CORRIDOR_LAYERS = new Set(['possible_corridors', 'possible_corridor', 'corridor']);
const SAMPLING_GAP_LAYERS = new Set(['sampling_gap_grid', 'sampling_gap']);

const KM_PER_DEGREE_LAT = 111.32;

export function boundsFromCenter(lat: number, lon: number, radiusKm: number): MapBounds {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const lonDelta = radiusKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
  };
}

export function boundsFromBbox(bbox: string): MapBounds | null {
  const parts = bbox.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = parts;
  return { minLon, minLat, maxLon, maxLat };
}

function markerTone(layer: string): ForecastMapMarker['tone'] {
  if (OBSERVATION_LAYERS.has(layer)) return 'observation';
  if (KNOWN_RECORD_LAYERS.has(layer)) return 'known_record';
  if (CORRIDOR_LAYERS.has(layer)) return 'corridor';
  if (SAMPLING_GAP_LAYERS.has(layer)) return 'sampling_gap';
  return 'context';
}

function readPointCoordinates(geometry: Record<string, unknown>): [number, number] | null {
  if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const [lon, lat] = geometry.coordinates;
  if (typeof lon !== 'number' || typeof lat !== 'number') {
    return null;
  }

  return [lon, lat];
}

function projectPoint(
  lon: number,
  lat: number,
  bounds: MapBounds
): { xPercent: number; yPercent: number } | null {
  const lonSpan = bounds.maxLon - bounds.minLon;
  const latSpan = bounds.maxLat - bounds.minLat;
  if (lonSpan <= 0 || latSpan <= 0) {
    return null;
  }

  const xPercent = ((lon - bounds.minLon) / lonSpan) * 100;
  const yPercent = ((bounds.maxLat - lat) / latSpan) * 100;
  if (xPercent < -8 || xPercent > 108 || yPercent < -8 || yPercent > 108) {
    return null;
  }

  return {
    xPercent: Math.min(96, Math.max(4, xPercent)),
    yPercent: Math.min(92, Math.max(8, yPercent)),
  };
}

function markerId(feature: GeoJSONFeature, index: number): string {
  const layer = String(feature.properties.layer ?? feature.properties.feature_type ?? 'feature');
  const observationId = feature.properties.observation_id;
  if (typeof observationId === 'string' && observationId.length > 0) {
    return `${layer}-${observationId}`;
  }
  return `${layer}-${index}`;
}

export function extractForecastMapMarkers(
  collection: GeoJSONFeatureCollection | null,
  bounds: MapBounds,
  limit = 24
): ForecastMapMarker[] {
  if (!collection) {
    return [];
  }

  const markers: ForecastMapMarker[] = [];
  for (const [index, feature] of collection.features.entries()) {
    const coordinates = readPointCoordinates(feature.geometry);
    if (!coordinates) {
      continue;
    }

    const [lon, lat] = coordinates;
    const projected = projectPoint(lon, lat, bounds);
    if (!projected) {
      continue;
    }

    const layer = String(feature.properties.layer ?? feature.properties.feature_type ?? '');
    markers.push({
      id: markerId(feature, index),
      xPercent: projected.xPercent,
      yPercent: projected.yPercent,
      tone: markerTone(layer),
    });

    if (markers.length >= limit) {
      break;
    }
  }

  return markers;
}
