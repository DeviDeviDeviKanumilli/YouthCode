import type { GeoJSONFeature, GeoJSONFeatureCollection } from '@/types/forecast';

export type MapLayerKind =
  | 'observations'
  | 'known_records'
  | 'possible_corridors'
  | 'waterways'
  | 'roads_trails'
  | 'parks'
  | 'sampling_gap_grid'
  | 'context';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapPointLayer = {
  id: string;
  kind: MapLayerKind;
  coordinate: MapCoordinate;
  observationId?: string;
};

export type MapLineLayer = {
  id: string;
  kind: MapLayerKind;
  coordinates: MapCoordinate[];
};

export type MapPolygonLayer = {
  id: string;
  kind: MapLayerKind;
  coordinates: MapCoordinate[];
  holes?: MapCoordinate[][];
};

export type ParsedGeoMapLayers = {
  points: MapPointLayer[];
  lines: MapLineLayer[];
  polygons: MapPolygonLayer[];
};

const OBSERVATION_LAYERS = new Set(['observations', 'observation']);
const KNOWN_RECORD_LAYERS = new Set(['known_records', 'known_record', 'verified_records']);
const CORRIDOR_LAYERS = new Set(['possible_corridors', 'possible_corridor', 'corridor']);
const WATERWAY_LAYERS = new Set(['waterways', 'waterway']);
const ROAD_LAYERS = new Set(['roads_trails', 'roads', 'trails']);
const PARK_LAYERS = new Set(['parks', 'park']);
const SAMPLING_LAYERS = new Set(['sampling_gap_grid', 'sampling_gap']);

function layerKind(layer: string): MapLayerKind {
  if (OBSERVATION_LAYERS.has(layer)) return 'observations';
  if (KNOWN_RECORD_LAYERS.has(layer)) return 'known_records';
  if (CORRIDOR_LAYERS.has(layer)) return 'possible_corridors';
  if (WATERWAY_LAYERS.has(layer)) return 'waterways';
  if (ROAD_LAYERS.has(layer)) return 'roads_trails';
  if (PARK_LAYERS.has(layer)) return 'parks';
  if (SAMPLING_LAYERS.has(layer)) return 'sampling_gap_grid';
  return 'context';
}

function toCoordinate(lon: number, lat: number): MapCoordinate | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }
  return { latitude: lat, longitude: lon };
}

function readPositionPair(value: unknown): MapCoordinate | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }
  const [lon, lat] = value;
  if (typeof lon !== 'number' || typeof lat !== 'number') {
    return null;
  }
  return toCoordinate(lon, lat);
}

function readLineCoordinates(value: unknown): MapCoordinate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((pair) => readPositionPair(pair))
    .filter((coordinate): coordinate is MapCoordinate => coordinate !== null);
}

function readPolygonRing(value: unknown): MapCoordinate[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }
  const ring = Array.isArray(value[0]) ? value[0] : value;
  return readLineCoordinates(ring);
}

function readPolygonHoles(value: unknown): MapCoordinate[][] {
  if (!Array.isArray(value) || value.length < 2) {
    return [];
  }
  return value
    .slice(1)
    .map((ring) => readLineCoordinates(ring))
    .filter((ring) => ring.length >= 3);
}

function featureId(feature: GeoJSONFeature, index: number): string {
  const layer = String(feature.properties.layer ?? feature.properties.feature_type ?? 'feature');
  const observationId = feature.properties.observation_id;
  if (typeof observationId === 'string' && observationId.length > 0) {
    return `${layer}-${observationId}`;
  }
  const cellId = feature.properties.cell_id ?? feature.properties.id;
  if (typeof cellId === 'string' || typeof cellId === 'number') {
    return `${layer}-${cellId}`;
  }
  return `${layer}-${index}`;
}

function observationIdFromProperties(properties: Record<string, unknown>): string | undefined {
  const value = properties.observation_id;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseFeature(feature: GeoJSONFeature, index: number): ParsedGeoMapLayers {
  const empty: ParsedGeoMapLayers = { points: [], lines: [], polygons: [] };
  const layer = String(feature.properties.layer ?? feature.properties.feature_type ?? '');
  const kind = layerKind(layer);
  const id = featureId(feature, index);
  const geometry = feature.geometry;
  const observationId = observationIdFromProperties(feature.properties);

  if (geometry.type === 'Point') {
    const coordinate = readPositionPair(geometry.coordinates);
    if (!coordinate) {
      return empty;
    }
    empty.points.push({ id, kind, coordinate, observationId });
    return empty;
  }

  if (geometry.type === 'LineString') {
    const coordinates = readLineCoordinates(geometry.coordinates);
    if (coordinates.length >= 2) {
      empty.lines.push({ id, kind, coordinates });
    }
    return empty;
  }

  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    geometry.coordinates.forEach((line, lineIndex) => {
      const coordinates = readLineCoordinates(line);
      if (coordinates.length >= 2) {
        empty.lines.push({ id: `${id}-${lineIndex}`, kind, coordinates });
      }
    });
    return empty;
  }

  if (geometry.type === 'Polygon') {
    const coordinates = readPolygonRing(geometry.coordinates);
    const holes = readPolygonHoles(geometry.coordinates);
    if (coordinates.length >= 3) {
      empty.polygons.push({ id, kind, coordinates, holes: holes.length > 0 ? holes : undefined });
    }
    return empty;
  }

  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    geometry.coordinates.forEach((polygon, polygonIndex) => {
      const coordinates = readPolygonRing(polygon);
      const holes = readPolygonHoles(polygon);
      if (coordinates.length >= 3) {
        empty.polygons.push({
          id: `${id}-${polygonIndex}`,
          kind,
          coordinates,
          holes: holes.length > 0 ? holes : undefined,
        });
      }
    });
  }

  return empty;
}

export function parseGeoJsonLayers(
  collections: Array<GeoJSONFeatureCollection | null | undefined>
): ParsedGeoMapLayers {
  const merged: ParsedGeoMapLayers = { points: [], lines: [], polygons: [] };

  for (const collection of collections) {
    if (!collection) {
      continue;
    }
    collection.features.forEach((feature, index) => {
      const parsed = parseFeature(feature, index);
      merged.points.push(...parsed.points);
      merged.lines.push(...parsed.lines);
      merged.polygons.push(...parsed.polygons);
    });
  }

  return merged;
}

export function mapLayerColors(kind: MapLayerKind) {
  switch (kind) {
    case 'observations':
      return { stroke: '#688062', fill: 'rgba(104,128,98,0.35)', marker: '#688062' };
    case 'known_records':
      return { stroke: '#5B7EB5', fill: 'rgba(91,126,181,0.28)', marker: '#5B7EB5' };
    case 'possible_corridors':
      return { stroke: '#D48943', fill: 'rgba(212,137,67,0.18)', marker: '#D48943' };
    case 'waterways':
      return { stroke: '#6E94D6', fill: 'rgba(110,148,214,0.16)', marker: '#6E94D6' };
    case 'roads_trails':
      return { stroke: 'rgba(244,241,232,0.55)', fill: 'rgba(244,241,232,0.08)', marker: '#C9C4B8' };
    case 'parks':
      return { stroke: '#4F6B52', fill: 'rgba(79,107,82,0.22)', marker: '#4F6B52' };
    case 'sampling_gap_grid':
      return { stroke: '#8A7B67', fill: 'rgba(138,123,103,0.24)', marker: '#8A7B67' };
    default:
      return { stroke: '#6E8F9A', fill: 'rgba(110,143,154,0.18)', marker: '#6E8F9A' };
  }
}

export function regionForCoordinate(lat: number, lon: number, radiusKm: number) {
  const latitudeDelta = Math.max((radiusKm / 111.32) * 2.2, 0.02);
  const longitudeDelta = Math.max(
    (radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1))) * 2.2,
    0.02
  );
  return {
    latitude: lat,
    longitude: lon,
    latitudeDelta,
    longitudeDelta,
  };
}
