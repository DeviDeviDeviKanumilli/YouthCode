// Photo preview / confirm step (PRD: "the app should show a preview screen … confirm, retake,
// or cancel"). Sits between capture and identification so a blurry/dark shot can be retaken
// before spending an AI call. Reads the pending photo without consuming it; processing consumes.
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { peekPendingPhoto } from "@/lib/captureStore";

const TIPS = [
  "Fill the frame with the leaves or flowers",
  "Get close, keep it in focus",
  "Good, even light helps identification",
];

export default function CapturePreview() {
  const router = useRouter();
  const pending = peekPendingPhoto();

  // No pending photo (e.g. deep-linked) — bounce back to the camera.
  if (!pending) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={[typography.body, { color: colors.onPrimary }]}>No photo to preview.</Text>
        <Pressable style={styles.retakeBtn} onPress={() => router.replace("/(tabs)/capture")}>
          <Text style={styles.retakeText}>Open camera</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <Image source={{ uri: pending.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.scrim} />

      <SafeAreaView edges={["top"]} style={styles.topBar}>
        <Pressable style={styles.glassBtn} onPress={() => router.replace("/(tabs)/capture")}>
          <Icon name="close" size={24} color={colors.onPrimary} />
        </Pressable>
        <Text style={styles.title}>Looks good?</Text>
        <View style={styles.glassBtn} />
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={styles.bottom}>
        <View style={styles.tips}>
          {TIPS.map((t) => (
            <View key={t} style={styles.tipRow}>
              <Icon name="check-circle" size={16} color={colors.mint} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.retakeBtn} onPress={() => router.replace("/(tabs)/capture")}>
            <Icon name="replay" size={20} color={colors.onPrimary} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
          <Pressable style={styles.useBtn} onPress={() => router.replace("/identify/processing")}>
            <Icon name="check" size={20} color={colors.onPrimary} />
            <Text style={styles.useText}>Use Photo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000", justifyContent: "space-between" },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.lg },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  title: { ...typography.sectionTitle, color: colors.onPrimary },
  glassBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  bottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  tips: { backgroundColor: "rgba(0,0,0,0.55)", borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
  tipRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tipText: { ...typography.caption, color: colors.onPrimary },
  actions: { flexDirection: "row", gap: spacing.md },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.button,
    paddingVertical: spacing.md,
  },
  retakeText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
  useBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
  },
  useText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
});
