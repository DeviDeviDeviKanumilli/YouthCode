import { apiGet } from './client';
import type { GeoJSONFeatureCollection } from '@/types/forecast';

export function getPublicForecast(lat: number, lon: number, radiusKm = 5) {
  return apiGet<GeoJSONFeatureCollection>(
    `/forecast/public?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
}

export function getPublicForecastByBbox(bbox: string) {
  return apiGet<GeoJSONFeatureCollection>(`/forecast/public?bbox=${encodeURIComponent(bbox)}`);
}
