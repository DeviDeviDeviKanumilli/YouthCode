import { apiGet } from './client';
import type { SamplingGapFeatureCollection } from '@/types/sampling';

export function getSamplingGapsForArea(lat: number, lon: number, radiusKm = 10) {
  const bbox = bboxForRadius(lat, lon, radiusKm);
  return apiGet<SamplingGapFeatureCollection>(
    `/sampling-gaps?bbox=${bbox}&mode=public`
  );
}

export function bboxForRadius(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  return [
    lon - lonDelta,
    lat - latDelta,
    lon + lonDelta,
    lat + latDelta,
  ]
    .map((value) => value.toFixed(6))
    .join(',');
}
