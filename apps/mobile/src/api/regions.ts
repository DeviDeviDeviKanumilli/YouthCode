import { apiGet } from './client';
import type { NearbyRegionSummary } from '@/types/regions';

export function getNearbyRegion(lat: number, lon: number, radiusKm = 10) {
  return apiGet<NearbyRegionSummary>(
    `/regions/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
}
