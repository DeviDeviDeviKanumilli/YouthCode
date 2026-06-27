import { apiGet, apiPost } from './client';
import type { UserCreatePayload, UserObservationListItem, UserRead } from '@/types/user';

export function createUser(payload: UserCreatePayload) {
  return apiPost<UserRead, UserCreatePayload>('/users', payload);
}

export function getUser(userId: string) {
  return apiGet<UserRead>(`/users/${userId}`);
}

export function getUserObservations(userId: string, limit = 50) {
  return apiGet<UserObservationListItem[]>(`/users/${userId}/observations?limit=${limit}`);
}
