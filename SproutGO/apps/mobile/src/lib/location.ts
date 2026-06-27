// Thin wrapper over expo-location for the capture flow. Best-effort by design: if the
// user denies permission or GPS is unavailable (R6), this resolves to null and the
// observation is created without coordinates — identify still works, it just won't post
// to the map. NOTE: expo-location is native; needs the custom EAS dev build, not Expo Go.

import * as Location from "expo-location";

export type Coords = { latitude: number; longitude: number };

// Asks for foreground location permission (no-op if already granted) and returns the
// current position, or null if denied/unavailable. Never throws — the caller treats a
// null as "no coordinates" rather than an error.
export async function requestAndGetPosition(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

// Whether foreground location is currently granted, without prompting. Used by the map
// to decide between the located view and the denied-state fallback.
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}
