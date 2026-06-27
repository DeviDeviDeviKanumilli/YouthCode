// Map tab — real @rnmapbox/maps exploration map. Discovery pins are fetched from
// GET /observations?bbox= as the viewport settles; rare-plant coords arrive already
// fuzzed server-side. Tapping a pin opens a preview sheet that routes to the plant.
// NOTE: @rnmapbox/maps is native — needs the custom EAS dev build (TECH_RISKS R1),
// it does NOT run in Expo Go.
import { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Mapbox from "@rnmapbox/maps";
import type { ObservationMarker, ObservationsMapResponse } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { RarityBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { requestAndGetPosition, hasLocationPermission } from "@/lib/location";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "");

// Outdoors style — green, trail-oriented; matches the "nature" design intent.
const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";
// Fallback center when location is unavailable: the NJ seed region (OPEN_QUESTIONS #1).
const DEFAULT_CENTER: [number, number] = [-74.4, 40.5];
const DEFAULT_ZOOM = 12;

// Map layers the user can toggle (PRD: friend/community discoveries as separate layers).
const LAYERS = [
  { key: "all", label: "All", icon: "public" },
  { key: "own", label: "Mine", icon: "person-pin-circle" },
  { key: "friend", label: "Friends", icon: "group" },
  { key: "public", label: "Community", icon: "groups" },
] as const;

function pinColor(m: ObservationMarker): string {
  return m.plant ? colors.rarity[m.plant.rarity] : colors.outline;
}
export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [markers, setMarkers] = useState<ObservationMarker[]>([]);
  const [selected, setSelected] = useState<ObservationMarker | null>(null);
  const [located, setLocated] = useState<boolean | null>(null); // null = checking
  const [onlyRare, setOnlyRare] = useState(false);
  const [layer, setLayer] = useState<"all" | "own" | "friend" | "public">("all");
  const [fetchFailed, setFetchFailed] = useState(false);

  // Fetch pins for the currently-visible bounds. getVisibleBounds returns
  // [[maxLng, maxLat], [minLng, minLat]] (NE, SW corners).
  const fetchVisible = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const [ne, sw] = await map.getVisibleBounds();
      const bbox = `${sw[0]},${sw[1]},${ne[0]},${ne[1]}`;
      const res = await api.get<ObservationsMapResponse>(`/observations?bbox=${bbox}`);
      setMarkers(res.markers);
      setFetchFailed(false);
    } catch (e) {
      // Keep the last good markers, but surface a non-blocking error so auth/API/privacy
      // failures don't masquerade as "no discoveries nearby".
      if (__DEV__) console.warn("[map] failed to load markers:", e);
      setFetchFailed(true);
    }
  }, []);

  // On focus, resolve location permission + center on the user if granted.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const granted = await hasLocationPermission();
        if (!active) return;
        setLocated(granted);
        if (granted) {
          const pos = await requestAndGetPosition();
          if (active && pos) {
            cameraRef.current?.setCamera({
              centerCoordinate: [pos.longitude, pos.latitude],
              zoomLevel: DEFAULT_ZOOM,
              animationDuration: 600,
            });
          }
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const visibleMarkers = markers.filter((m) => {
    if (layer !== "all" && m.source !== layer) return false;
    if (onlyRare && m.rarity !== "RARE" && m.rarity !== "LEGENDARY") return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <Mapbox.MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE}
        onMapIdle={fetchVisible}
        scaleBarEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: DEFAULT_CENTER, zoomLevel: DEFAULT_ZOOM }}
        />
        {located ? <Mapbox.UserLocation visible androidRenderMode="normal" /> : null}

        {visibleMarkers.map((m) => (
          <Mapbox.PointAnnotation
            key={m.id}
            id={m.id}
            coordinate={[m.longitude, m.latitude]}
            onSelected={() => setSelected(m)}
          >
            <View style={[styles.pin, { borderColor: pinColor(m) }]}>
              <View style={[styles.pinDot, { backgroundColor: pinColor(m) }]} />
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* Floating filters: layer (Mine/Friends/Community) + rare-only */}
      <SafeAreaView edges={["top"]} style={styles.topBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {LAYERS.map((l) => {
            const active = layer === l.key;
            return (
              <Pressable
                key={l.key}
                style={[styles.toggle, active && styles.toggleActive]}
                onPress={() => setLayer(l.key)}
              >
                <Icon name={l.icon} size={16} color={active ? colors.onPrimary : colors.textMuted} />
                <Text style={[styles.toggleText, active && { color: colors.onPrimary }]}>{l.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.toggle, onlyRare && { borderColor: colors.rarity.RARE }]}
            onPress={() => setOnlyRare((v) => !v)}
          >
            <Icon name="star" size={16} color={onlyRare ? colors.rarity.RARE : colors.textMuted} />
            <Text style={styles.toggleText}>Rare</Text>
          </Pressable>
        </ScrollView>

        {fetchFailed ? (
          <Pressable style={styles.errorBanner} onPress={fetchVisible}>
            <Icon name="cloud-off" size={16} color={colors.danger} />
            <Text style={styles.errorText}>Couldn{"’"}t refresh markers</Text>
            <Text style={styles.errorRetry}>Retry</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>

      {/* Recenter FAB */}
      <Pressable
        style={styles.recenter}
        onPress={async () => {
          const pos = await requestAndGetPosition();
          setLocated(!!pos);
          if (pos) {
            cameraRef.current?.setCamera({
              centerCoordinate: [pos.longitude, pos.latitude],
              zoomLevel: DEFAULT_ZOOM,
              animationDuration: 600,
            });
          }
        }}
      >
        <Icon name="my-location" size={24} color={colors.primary} />
      </Pressable>

      {located === false ? (
        <View style={styles.deniedBanner}>
          <Icon name="location-off" size={18} color={colors.textMuted} />
          <Text style={styles.deniedText}>Enable location to see nearby discoveries</Text>
        </View>
      ) : null}

      {selected?.plant ? (
        <Pressable style={styles.sheet} onPress={() => router.push(`/plant/${selected.plant!.id}`)}>
          <View style={styles.handle} />
          <View style={styles.sheetRow}>
            <View style={styles.thumbWrap}>
              {selected.plant.imageUrl ? (
                <Image source={{ uri: selected.plant.imageUrl }} style={styles.thumb} />
              ) : null}
              <View style={[styles.thumbDot, { backgroundColor: pinColor(selected) }]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.sheetTop}>
                <RarityBadge rarity={selected.plant.rarity} />
                {selected.fuzzed ? (
                  <View style={styles.distance}>
                    <Icon name="location-on" size={14} color={colors.textMuted} />
                    <Text style={typography.caption}>Approx.</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[typography.sectionTitle, { marginTop: 4 }]} numberOfLines={1}>
                {selected.plant.commonName ?? selected.plant.scientificName}
              </Text>
              <Text style={typography.scientificName} numberOfLines={1}>
                {selected.plant.scientificName}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceContainer },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.deep,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: spacing.sm },
  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.md },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { ...typography.badge, color: colors.textMuted },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: { ...typography.caption, color: colors.danger },
  errorRetry: { ...typography.badge, color: colors.primary },
  recenter: {
    position: "absolute",
    bottom: 200,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  // PLACEHOLDER_STYLES2
  deniedBanner: {
    position: "absolute",
    top: 64,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deniedText: { ...typography.caption },
  sheet: {
    position: "absolute",
    bottom: 96,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, marginBottom: spacing.sm },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumbWrap: { width: 72, height: 72, borderRadius: radius.button, overflow: "hidden", borderWidth: 1, borderColor: colors.sage, backgroundColor: colors.surfaceContainer },
  thumb: { width: "100%", height: "100%" },
  thumbDot: { position: "absolute", top: 4, right: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.surfaceLowest },
  sheetTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  distance: { flexDirection: "row", alignItems: "center", gap: 2 },
});


