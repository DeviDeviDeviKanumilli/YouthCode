// Capture tab (Stitch Camera Screen). Live expo-camera viewfinder with a framing
// reticle, top close/flash controls, an instruction bubble, and a shutter that takes a
// photo, grabs best-effort GPS, and kicks off identification. (expo-camera itself runs
// in Expo Go; the app as a whole needs a dev build because the Map tab pulls in
// @rnmapbox/maps — see currentPlans/DEV_BUILD.md and TECH_RISKS R1.)
import { useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CameraView, useCameraPermissions, type FlashMode } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { setPendingPhoto } from "@/lib/captureStore";
import { requestAndGetPosition } from "@/lib/location";

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<FlashMode>("off");
  const [busy, setBusy] = useState(false);

  async function onShutter() {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        // Best-effort GPS — if denied/unavailable, coords is null and the observation
        // is created without a location (identify still works, just no map pin, R6).
        const coords = await requestAndGetPosition();
        setPendingPhoto(photo.uri, coords);
        // Confirm/retake before spending an AI call (PRD preview step).
        router.push("/identify/preview");
      }
    } finally {
      setBusy(false);
    }
  }

  // Permission not yet resolved — render nothing rather than flashing the prompt.
  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.permWrap]}>
        <Icon name="photo-camera" size={48} color={colors.onPrimary} />
        <Text style={styles.permText}>SproutGo needs camera access to identify plants.</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Access</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/(tabs)/map")}>
          <Text style={styles.permSkip}>Not now</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash={flash} />
      <SafeAreaView edges={["top"]} style={styles.topBar}>
        <Pressable style={styles.glassBtn} onPress={() => router.replace("/(tabs)/map")}>
          <Icon name="close" size={24} color={colors.onPrimary} />
        </Pressable>
        <Pressable
          style={styles.glassBtn}
          onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
        >
          <Icon name={flash === "on" ? "flash-on" : "flash-off"} size={24} color={colors.onPrimary} />
        </Pressable>
      </SafeAreaView>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <View style={[styles.reticle, styles.tl]} />
          <View style={[styles.reticle, styles.tr]} />
          <View style={[styles.reticle, styles.bl]} />
          <View style={[styles.reticle, styles.br]} />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.instruction}>
          <Text style={styles.instructionText}>Center your plant</Text>
        </View>
        <View style={styles.controlRow}>
          <View style={styles.glassBtn}>
            <Icon name="photo-library" size={24} color={colors.onPrimary} />
          </View>
          <Pressable style={styles.shutter} onPress={onShutter} disabled={busy}>
            <View style={styles.shutterInner}>
              <Icon name="local-florist" size={30} color={colors.onPrimary} />
            </View>
          </Pressable>
          <View style={styles.glassBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", justifyContent: "space-between" },
  permWrap: { alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  permText: { ...typography.body, color: colors.onPrimary, textAlign: "center" },
  permBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  permBtnText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
  permSkip: { ...typography.caption, color: colors.onPrimary, opacity: 0.7 },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  glassBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  frameWrap: { alignItems: "center", justifyContent: "center" },
  frame: { width: 256, height: 256, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", borderRadius: radius.button },
  reticle: { position: "absolute", width: 28, height: 28, borderColor: "#fff" },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.button },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.button },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.button },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.button },
  controls: { alignItems: "center", paddingBottom: spacing.xxl, paddingTop: spacing.lg, backgroundColor: "rgba(0,0,0,0.35)" },
  instruction: { backgroundColor: "rgba(0,0,0,0.6)", borderRadius: radius.pill, paddingHorizontal: 24, paddingVertical: 8, marginBottom: spacing.xl },
  instructionText: { ...typography.caption, color: colors.onPrimary },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xxl },
  shutter: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff", padding: 4 },
  shutterInner: { flex: 1, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
