// Bottom-tab navigation (design.md §7). Tabs: Map, PlantDex, Capture (centered/emphasized),
// Feed, Profile. Library lives inside PlantDex (§7.2); Forums inside Feed (§7.3) — not tabs.
// Custom tab bar matches the Stitch mockups: icon+label tabs, a mint "pill" behind the
// active tab, and a raised central Capture FAB.

import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text, View, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";

type TabDef = { name: string; label: string; icon: IconName };

const TABS: TabDef[] = [
  { name: "map", label: "Map", icon: "map" },
  { name: "plantdex", label: "PlantDex", icon: "style" },
  { name: "capture", label: "Capture", icon: "local-florist" },
  { name: "feed", label: "Feed", icon: "rss-feed" },
  { name: "profile", label: "Profile", icon: "person" },
];

function SproutTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const def = TABS.find((t) => t.name === route.name);
        if (!def) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        // Capture is the emphasized center action — a raised primary FAB.
        if (def.name === "capture") {
          return (
            <Pressable key={route.key} style={styles.captureWrap} onPress={onPress} hitSlop={8}>
              <View style={styles.captureFab}>
                <Icon name={def.icon} size={28} color={colors.onPrimary} />
              </View>
              <Text style={styles.captureLabel}>{def.label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress} hitSlop={8}>
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Icon
                name={def.icon}
                size={24}
                color={focused ? colors.onSecondaryContainer : colors.textMuted}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{def.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <SproutTabBar {...props} />}
    >
      <Tabs.Screen name="map" />
      <Tabs.Screen name="plantdex" />
      <Tabs.Screen name="capture" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: colors.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    ...Platform.select({
      ios: { shadowColor: colors.deep, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 8 },
    }),
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  iconPill: {
    height: 32,
    minWidth: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  iconPillActive: { backgroundColor: colors.secondaryContainer },
  label: { ...typography.badge, fontSize: 10, color: colors.textMuted },
  labelActive: { color: colors.primary, fontWeight: "700" },
  captureWrap: { flex: 1, alignItems: "center", gap: 2 },
  captureFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    borderWidth: 4,
    borderColor: colors.surfaceLowest,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  captureLabel: { ...typography.badge, fontSize: 10, color: colors.textMuted },
});
