// Ambient types for the EXPO_PUBLIC_* env vars read via process.env in the app.
// Expo inlines these at build time. We declare a minimal process.env shape rather
// than pulling all of @types/node into the React Native bundle.

declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_MAPBOX_TOKEN?: string;
    EXPO_PUBLIC_API_BASE_URL?: string;
    [key: string]: string | undefined;
  };
};
