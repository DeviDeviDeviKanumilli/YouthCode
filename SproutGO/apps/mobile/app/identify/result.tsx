// Discovery reward screen — the celebratory moment after identification. A hexagon
// badge holds the plant photo, a gold points pill animates in, and CTAs route to the
// PlantDex entry. Renders the real ObservationResult from the capture store; handles the
// UNCERTAIN (low-confidence) and quota-reached cases distinctly from a clean discovery.
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";
import { HexBadge } from "@/components/HexBadge";
import { RarityBadge } from "@/components/ui";
import { takeLastResult } from "@/lib/captureStore";
import { api } from "@/lib/api";

type Visibility = "PRIVATE" | "FRIENDS" | "PUBLIC";
const VISIBILITY: { key: Visibility; label: string; icon: IconName }[] = [
  { key: "PRIVATE", label: "Private", icon: "lock" },
  { key: "FRIENDS", label: "Friends", icon: "group" },
  { key: "PUBLIC", label: "Public", icon: "public" },
];

export default function IdentifyResult() {
  const router = useRouter();
  const result = useRef(takeLastResult()).current;
  const pop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(80)).current;
  // Captures are created PRIVATE; the user opts up to FRIENDS/PUBLIC here. Optimistic:
  // reflect the choice immediately, revert if the PATCH fails.
  const [privacy, setPrivacy] = useState<Visibility>(
    (result?.observation.privacy as Visibility) ?? "PRIVATE",
  );

  function setVisibility(next: Visibility) {
    if (!result || next === privacy) return;
    setPrivacy(next);
    api
      .patch(`/observations/${result.observation.id}`, { privacy: next })
      .catch(() => setPrivacy((result.observation.privacy as Visibility) ?? "PRIVATE"));
  }

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [pop, slide]);

  // No result in the store (e.g. deep-linked or reloaded) — bounce to capture.
  if (!result) {
    return (
      <View style={[styles.root, styles.fallback]}>
        <Text style={[typography.body, { color: colors.text }]}>No identification to show.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/capture")}>
          <Text style={styles.primaryText}>Take a Photo</Text>
        </Pressable>
      </View>
    );
  }

  const { plant, confidence, isFirstDiscovery, pointsAwarded, quotaReached } = result;
  const uncertain = plant === null;
  const heroUri = plant?.imageUrl ?? null;

  return (
    <View style={styles.root}>
      <ImageBackground
        source={heroUri ? { uri: heroUri } : undefined}
        style={StyleSheet.absoluteFill}
        blurRadius={2}
      >
        <View style={styles.scrim} />
      </ImageBackground>

      <SafeAreaView edges={["top"]} style={styles.closeWrap}>
        <Pressable style={styles.closeBtn} onPress={() => router.replace("/(tabs)/plantdex")}>
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>
      </SafeAreaView>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={styles.handle} />
        <Animated.View style={{ transform: [{ scale: pop }], marginBottom: spacing.lg }}>
          {uncertain ? (
            <View style={styles.uncertainBadge}>
              <Icon name="help-outline" size={64} color={colors.secondary} />
            </View>
          ) : (
            <HexBadge imageUrl={plant.imageUrl} rarity={plant.rarity} size={140} />
          )}
        </Animated.View>

        {uncertain ? (
          <>
            <Text style={styles.kicker}>Not sure yet</Text>
            <Text style={styles.title}>Uncertain match</Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm }]}>
              We couldn{"’"}t confidently identify this one
              {confidence != null ? ` (${Math.round(confidence * 100)}% confidence)` : ""}.
              Try a clearer photo of the leaves or flowers.
            </Text>
            <Pressable style={[styles.primaryBtn, { marginTop: spacing.xl }]} onPress={() => router.replace("/(tabs)/capture")}>
              <Icon name="photo-camera" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryText}>Try Again</Text>
            </Pressable>
          </>
        ) : (
          <>
            {pointsAwarded > 0 ? (
              <View style={styles.pointsPill}>
                <Icon name="stars" size={16} color={colors.onPrimary} />
                <Text style={styles.pointsText}>+{pointsAwarded} Points</Text>
              </View>
            ) : quotaReached ? (
              <View style={[styles.pointsPill, { backgroundColor: colors.surfaceHigh }]}>
                <Icon name="hourglass-empty" size={16} color={colors.secondary} />
                <Text style={[styles.pointsText, { color: colors.secondary }]}>Daily limit reached</Text>
              </View>
            ) : null}

            <Text style={styles.kicker}>
              {isFirstDiscovery ? "New species!" : "Congrats! You discovered"}
            </Text>
            <Text style={styles.title}>{plant.commonName ?? plant.scientificName}</Text>
            <Text style={[typography.scientificName, { fontSize: 15, color: colors.secondary }]}>
              {plant.scientificName}
            </Text>

            <View style={styles.metaRow}>
              <RarityBadge rarity={plant.rarity} />
              {confidence != null ? (
                <View style={styles.metaChip}>
                  <Icon name="verified" size={15} color={colors.primary} />
                  <Text style={styles.metaChipText}>
                    {Math.round(confidence * 100)}% Confidence
                  </Text>
                </View>
              ) : null}
            </View>

            {result.observation.latitude != null ? (
              <View style={styles.privacyBlock}>
                <Text style={styles.privacyLabel}>Who can see this location?</Text>
                <View style={styles.privacyRow}>
                  {VISIBILITY.map((v) => {
                    const active = privacy === v.key;
                    return (
                      <Pressable
                        key={v.key}
                        onPress={() => setVisibility(v.key)}
                        style={[styles.privacyChip, active && styles.privacyChipActive]}
                      >
                        <Icon name={v.icon} size={16} color={active ? colors.onPrimary : colors.textMuted} />
                        <Text style={[styles.privacyChipText, active && { color: colors.onPrimary }]}>
                          {v.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {plant.description ? (
              <View style={styles.about}>
                <Text style={typography.sectionTitle}>About This Plant</Text>
                <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
                  {plant.description}
                </Text>
              </View>
            ) : null}

            <Pressable style={styles.primaryBtn} onPress={() => router.replace(`/plant/${plant.id}`)}>
              <Icon name="menu-book" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryText}>View PlantDex Entry</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.replace(`/post/new?observationId=${result.observation.id}`)}
            >
              <Icon name="ios-share" size={20} color={colors.primary} />
              <Text style={styles.secondaryText}>Share Discovery</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fallback: { alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl },
  uncertainBadge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  closeWrap: { position: "absolute", top: 0, right: 0, left: 0, zIndex: 20, alignItems: "flex-end", padding: spacing.lg },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: "auto",
    backgroundColor: colors.surfaceLowest,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  handle: {
    position: "absolute",
    top: spacing.md,
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
  },
  pointsText: { ...typography.badge, color: colors.onPrimary },
  kicker: { ...typography.badge, color: colors.gold, textTransform: "uppercase", marginBottom: spacing.xs },
  title: { ...typography.largeTitle, fontSize: 30 },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.lg },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaChipText: { ...typography.caption, color: colors.text },
  privacyBlock: { width: "100%", marginBottom: spacing.lg, gap: spacing.sm },
  privacyLabel: { ...typography.caption, fontWeight: "600", color: colors.textMuted },
  privacyRow: { flexDirection: "row", gap: spacing.sm },
  privacyChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  privacyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  privacyChipText: { ...typography.badge, color: colors.textMuted },
  about: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.button,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    marginBottom: spacing.sm,
  },
  primaryText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
  },
  secondaryText: { ...typography.body, color: colors.primary, fontWeight: "600" },
});
