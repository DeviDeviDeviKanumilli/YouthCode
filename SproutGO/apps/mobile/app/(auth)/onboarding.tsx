// Onboarding + permissions primer (design §8.1). Short paged intro (3 slides) ending
// on a permissions explainer, then routes to signup. Presentational — the real OS
// permission prompts land with the camera/map features (M1/M2).
import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";
import { onboardingSlides } from "@/lib/mockData";

const PERMISSIONS: { icon: IconName; title: string; copy: string }[] = [
  {
    icon: "photo-camera",
    title: "Camera",
    copy: "SproutGo uses your camera to identify plants and add them to your PlantDex.",
  },
  {
    icon: "place",
    title: "Location",
    copy: "SproutGo uses your location to place plant discoveries on your map.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const total = onboardingSlides.length + 1; // +1 permissions slide

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function next() {
    if (page < total - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    } else {
      router.replace("/(auth)/signup");
    }
  }

  const onLast = page === total - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>SproutGo</Text>
        <Pressable hitSlop={8} onPress={() => router.replace("/(auth)/signup")}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {onboardingSlides.map((s) => (
          <View key={s.key} style={[styles.slide, { width }]}>
            <View style={styles.iconHero}>
              <Icon name={s.icon} size={72} color={colors.primary} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}

        <View style={[styles.slide, { width }]}>
          <Text style={styles.title}>A couple of permissions</Text>
          <Text style={[styles.body, { marginBottom: spacing.xl }]}>
            SproutGo only asks for what the core experience needs.
          </Text>
          {PERMISSIONS.map((p) => (
            <View key={p.title} style={styles.permRow}>
              <View style={styles.permIcon}>
                <Icon name={p.icon} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle}>{p.title}</Text>
                <Text style={styles.permCopy}>{p.copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {[...Array(total)].map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <Pressable style={styles.cta} onPress={next}>
        <Text style={styles.ctaText}>{onLast ? "Get Started" : "Next"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  wordmark: { ...typography.sectionTitle, color: colors.primary },
  skip: { ...typography.caption, fontWeight: "600" },
  slide: { paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", flex: 1 },
  iconHero: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { ...typography.largeTitle, textAlign: "center", marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.md },
  permRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignSelf: "stretch",
  },
  permIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  permTitle: { ...typography.body, fontWeight: "700" },
  permCopy: { ...typography.caption, marginTop: 2 },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sage },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  cta: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    height: 54,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { ...typography.body, fontWeight: "700", color: colors.onPrimary },
});
