// First Discovery modal (design §8.8, Stitch "First Discovery Modal"). A centered reward
// card on a dimmed surface: gold heading, glowing gold hexagon badge, rarity label, bonus
// points, and Share/Continue actions. Renders the real ObservationResult from the capture
// store (processing only routes here on a matched first discovery).
import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { HexBadge } from "@/components/HexBadge";
import { rarityLabel } from "@/lib/mockData";
import { takeLastResult } from "@/lib/captureStore";

export default function FirstDiscovery() {
  const router = useRouter();
  const result = useRef(takeLastResult()).current;
  const pop = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [pop, glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  const plant = result?.plant;
  if (!plant) {
    return (
      <View style={[styles.backdrop, styles.fallback]}>
        <Text style={typography.body}>No discovery to show.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/capture")}>
          <Text style={styles.primaryText}>Take a Photo</Text>
        </Pressable>
      </View>
    );
  }

  // Always gold-ringed: the First Discovery moment is itself the reward treatment
  // (design §8.8), independent of the species' own rarity tier.
  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>
        <View style={styles.celebrateGlow} />

        <Text style={styles.heading}>First Discovery!</Text>
        <Text style={styles.subhead}>You found something new.</Text>

        <View style={styles.badgeWrap}>
          <Animated.View style={[styles.badgeGlow, { opacity: glowOpacity }]} />
          <HexBadge imageUrl={plant.imageUrl} rarity="LEGENDARY" size={176} />
          <View style={styles.rarityLabel}>
            <Text style={styles.rarityLabelText}>{rarityLabel[plant.rarity].toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.name}>{plant.commonName ?? plant.scientificName}</Text>
        <Text style={[typography.scientificName, { marginBottom: spacing.lg }]}>{plant.scientificName}</Text>

        <View style={styles.pointsPill}>
          <Icon name="stars" size={18} color={colors.primaryContainer} />
          <Text style={styles.pointsText}>Bonus: +{result.pointsAwarded} Points</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              router.replace(
                result ? `/post/new?observationId=${result.observation.id}` : "/post/new",
              )
            }
          >
            <Icon name="ios-share" size={20} color={colors.onPrimary} />
            <Text style={styles.primaryText}>Share Discovery</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/(tabs)/plantdex")}>
            <Text style={styles.secondaryText}>Continue</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  fallback: { gap: spacing.lg },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    overflow: "hidden",
  },
  celebrateGlow: {
    position: "absolute",
    top: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.gold,
    opacity: 0.08,
  },
  heading: { ...typography.largeTitle, color: colors.gold, marginBottom: spacing.xs },
  subhead: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  badgeWrap: { alignItems: "center", justifyContent: "center", marginBottom: spacing.xl + 8 },
  badgeGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.gold,
  },
  rarityLabel: {
    position: "absolute",
    bottom: -14,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceLowest,
  },
  rarityLabelText: { ...typography.badge, fontSize: 10, color: colors.deep, letterSpacing: 1 },
  name: { ...typography.sectionTitle, marginBottom: spacing.xs },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginBottom: spacing.xl,
  },
  pointsText: { ...typography.badge, fontWeight: "700", color: colors.primaryContainer },
  actions: { width: "100%", gap: spacing.sm },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.body, fontWeight: "700", color: colors.onPrimary },
  secondaryBtn: {
    height: 52,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { ...typography.body, fontWeight: "600", color: colors.textMuted },
});
