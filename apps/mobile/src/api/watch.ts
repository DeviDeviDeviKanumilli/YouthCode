import { apiGet } from './client';
import type { GoodPlaceDetail, WatchItemDetail, WatchScreenResponse } from '../types/watch';

export function getWatchScreen(lat: number, lon: number, radiusKm = 5) {
  return apiGet<WatchScreenResponse>(
    `/consumer/watch?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
}

export function getWatchItemDetail(id: string) {
  return apiGet<WatchItemDetail>(`/consumer/watch/items/${id}`);
}

export function getWatchPlaceDetail(id: string) {
  return apiGet<GoodPlaceDetail>(`/consumer/watch/places/${id}`);
}

