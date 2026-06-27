import type { ExpoConfig } from "expo/config";

// Expo config. @rnmapbox/maps ships its own native code that is NOT bundled into Expo
// Go, so this app requires a custom dev build to run at all (TECH_RISKS R1, build steps
// in currentPlans/DEV_BUILD.md). expo-camera/expo-location ARE in Expo Go — Mapbox is the
// sole forcing function. The rnmapbox download token is a build-time secret
// (MAPBOX_DOWNLOAD_TOKEN); the runtime map uses a separate public, URL-restricted token
// (EXPO_PUBLIC_MAPBOX_TOKEN).
// Bundle id / Android package are overridable via env so a fresh machine can avoid a
// signing collision under a different Apple ID without editing tracked code (set
// IOS_BUNDLE_ID in apps/mobile/.env). Defaults to the canonical id.
const BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? "com.sproutgo.app";

const config: ExpoConfig = {
  name: "SproutGo",
  slug: "sproutgo",
  scheme: "sproutgo",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    infoPlist: {
      NSCameraUsageDescription:
        "SproutGo uses your camera to identify plants and add them to your PlantDex.",
      NSLocationWhenInUseUsageDescription:
        "SproutGo uses your location to place plant discoveries on your map.",
      // Allow cleartext HTTP only to local/LAN addresses so a physical device can reach a
      // dev API at http://<mac-ip>:3000. This does NOT permit arbitrary internet cleartext;
      // production traffic should still be HTTPS (e.g. the Vercel URL).
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    package: BUNDLE_ID,
    permissions: ["CAMERA", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  },
  plugins: [
    "expo-router",
    [
      "@rnmapbox/maps",
      { RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN ?? "" },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "SproutGo uses your camera to identify plants and add them to your PlantDex.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "SproutGo uses your location to place plant discoveries on your map.",
      },
    ],
  ],
  extra: {
    // Wired in M2 with a real EAS project id.
    eas: { projectId: "" },
  },
};

export default config;
