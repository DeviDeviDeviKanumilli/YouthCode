// Reusable M0 placeholder for tab screens. Each tab is navigable now; real feature
// content arrives in its milestone (Map→M2, PlantDex/Library→M3, Capture→M1, Feed→M4).

import { Text, View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, typography } from "@/theme";

export function ScreenPlaceholder({
  title,
  subtitle,
  milestone,
}: {
  title: string;
  subtitle: string;
  milestone: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.largeTitle}>{title}</Text>
        <Text style={[typography.body, styles.subtitle]}>{subtitle}</Text>
        <View style={styles.card}>
          <Text style={typography.caption}>Coming in {milestone}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: { color: colors.textMuted },
  card: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
});
