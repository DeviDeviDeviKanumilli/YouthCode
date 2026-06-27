// Ephemeral hand-off store for the capture→processing→result flow. expo-router params
// only carry strings cleanly, and the captured photo URI + the ObservationResult are
// richer than that — so we stash them here for the next screen to pick up. This is
// session-only scratch state, intentionally NOT global app state.

import type { ObservationResult } from "@sproutgo/shared";
import type { Coords } from "./location";

let pendingPhotoUri: string | null = null;
let pendingCoords: Coords | null = null;
let lastResult: ObservationResult | null = null;

export function setPendingPhoto(uri: string, coords: Coords | null = null): void {
  pendingPhotoUri = uri;
  pendingCoords = coords;
}

// Read the pending photo WITHOUT consuming it (the preview screen needs to display it before
// the user confirms; processing then consumes it with takePendingPhoto).
export function peekPendingPhoto(): { uri: string; coords: Coords | null } | null {
  return pendingPhotoUri ? { uri: pendingPhotoUri, coords: pendingCoords } : null;
}

export function takePendingPhoto(): { uri: string; coords: Coords | null } | null {
  if (!pendingPhotoUri) return null;
  const out = { uri: pendingPhotoUri, coords: pendingCoords };
  pendingPhotoUri = null;
  pendingCoords = null;
  return out;
}

export function setLastResult(result: ObservationResult): void {
  lastResult = result;
}

export function takeLastResult(): ObservationResult | null {
  const result = lastResult;
  lastResult = null;
  return result;
}
