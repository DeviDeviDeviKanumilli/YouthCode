// AI processing screen — shown after capture while the species is identified. Uploads
// the captured photo to Storage, POSTs to /observations, then hands the result to the
// reward screen. Animated scan line + spinner give the "analyzing" feel; on failure it
// surfaces a retry/back affordance instead of hanging.
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, Animated, Easing, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { uploadObservationPhoto } from "@/lib/storage";
import { takePendingPhoto, setLastResult } from "@/lib/captureStore";
import type { ObservationResult } from "@sproutgo/shared";

export default function Processing() {
  const router = useRouter();
  const { session } = useAuth();
  const scan = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(takePendingPhoto()).current;
  const photoUri = pending?.uri ?? null;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();

    let cancelled = false;
    (async () => {
      const userId = session?.user?.id;
      if (!photoUri || !userId) {
        if (!cancelled) setError("Missing photo or session. Please try again.");
        return;
      }
      try {
        const imagePath = await uploadObservationPhoto(photoUri, userId);
        const result = await api.post<ObservationResult>("/observations", {
          imagePath,
          ...(pending?.coords
            ? { latitude: pending.coords.latitude, longitude: pending.coords.longitude }
            : {}),
        });
        if (cancelled) return;
        setLastResult(result);
        // A first discovery earns the special gold reward modal (design §8.8); every
        // other match goes to the standard result screen.
        router.replace(result.isFirstDiscovery ? "/identify/first-discovery" : "/identify/result");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Identification failed.");
      }
    })();

    return () => {
      cancelled = true;
      loop.stop();
    };
  }, [router, scan, session, photoUri]);

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 360] });

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.closeBtn} onPress={() => router.replace("/(tabs)/map")}>
        <Icon name="close" size={22} color={colors.textMuted} />
      </Pressable>

      <View style={styles.center}>
        <View style={styles.photoCard}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}
          {!error ? (
            <>
              <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
              <View style={[styles.reticle, styles.tl]} />
              <View style={[styles.reticle, styles.tr]} />
              <View style={[styles.reticle, styles.bl]} />
              <View style={[styles.reticle, styles.br]} />
            </>
          ) : null}
        </View>

        {error ? (
          <>
            <Icon name="error-outline" size={40} color={colors.secondary} />
            <Text style={[typography.sectionTitle, { marginTop: spacing.md }]}>Identification Failed</Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign: "center" }]}>
              {error}
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => router.replace("/(tabs)/capture")}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
            <Text style={[typography.sectionTitle, { marginTop: spacing.md }]}>Analyzing Specimen</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Cross-referencing PlantDex database...
            </Text>

            <View style={styles.hint}>
              <Text style={styles.hintText}>
                Ensure the leaf structure is clearly visible for accurate identification.
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceLowest },
  closeBtn: {
    position: "absolute",
    top: 48,
    left: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceLowest,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  photoCard: {
    width: 288,
    height: 360,
    borderRadius: radius.sheet,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    backgroundColor: colors.surfaceVariant,
  },
  photo: { width: "100%", height: "100%" },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  reticle: { position: "absolute", width: 24, height: 24, borderColor: colors.primary },
  tl: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  hint: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 280,
  },
  hintText: { ...typography.caption, color: colors.secondary, textAlign: "center" },
  retryBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
});
