// Settings screen (design §8.15 settings section, §12 destructive confirmation).
// Grouped rows: toggles, value rows, and links. Sign-out calls the real auth hook;
// everything else is presentational.
import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { settingsSections, type SettingRow } from "@/lib/mockData";

export default function Settings() {
  const router = useRouter();
  const { signOut, session } = useAuth();

  // Surface real account data instead of placeholders (PRD account feature).
  function displayValue(row: SettingRow): string | undefined {
    if (row.key === "email") return session?.user?.email ?? row.value;
    // The server default for new captures is PRIVATE (privacy-by-default).
    if (row.key === "privacy") return "Private";
    return row.value;
  }
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      settingsSections.flatMap((s) =>
        s.rows.filter((r) => r.kind === "toggle").map((r) => [r.key, !!r.on]),
      ),
    ),
  );

  function onRowPress(row: SettingRow) {
    if (row.key === "signout") return signOut();
    if (row.key === "edit") return router.push("/profile/edit");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={typography.sectionTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.key}
                  onPress={() => onRowPress(row)}
                  style={[styles.row, i < section.rows.length - 1 && styles.rowDivider]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: row.destructive ? colors.dangerContainer : colors.surfaceLow },
                    ]}
                  >
                    <Icon
                      name={row.icon}
                      size={20}
                      color={row.destructive ? colors.danger : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.label,
                      row.destructive && { color: colors.danger },
                    ]}
                  >
                    {row.label}
                  </Text>
                  {row.kind === "toggle" ? (
                    <Switch
                      value={toggles[row.key]}
                      onValueChange={(v) => setToggles((t) => ({ ...t, [row.key]: v }))}
                      trackColor={{ true: colors.primary, false: colors.sage }}
                      thumbColor={colors.surfaceLowest}
                    />
                  ) : row.kind === "value" ? (
                    <Text style={styles.value}>{displayValue(row)}</Text>
                  ) : row.destructive ? null : (
                    <Icon name="chevron-right" size={22} color={colors.textMuted} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Text style={styles.version}>SproutGo v0.1.0 (MVP)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: spacing.md,
  },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, fontWeight: "600", marginLeft: spacing.xs },
  card: {
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceLow },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.body, flex: 1 },
  value: { ...typography.caption },
  version: { ...typography.caption, textAlign: "center", marginTop: spacing.md },
});
