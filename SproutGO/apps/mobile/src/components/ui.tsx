// Shared presentational primitives for the SproutGo UI. All styling pulls from the
// theme token system (no one-off colors/margins). These back the tab + sub-route
// screens so rarity badges, chips, headers, and avatars stay consistent.
import {
  Text,
  View,
  StyleSheet,
  Image,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";
import { rarityLabel, type Rarity } from "@/lib/mockData";

export function RarityBadge({ rarity, solid = false }: { rarity: Rarity; solid?: boolean }) {
  const color = colors.rarity[rarity];
  if (solid) {
    return (
      <View style={[styles.badgeSolid, { backgroundColor: color }]}>
        <Text style={styles.badgeSolidText}>{rarityLabel[rarity]}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badgeOutline, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeOutlineText, { color }]}>{rarityLabel[rarity]}</Text>
    </View>
  );
}

export function Chip({
  label,
  icon,
  active = false,
  onPress,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      {icon ? (
        <Icon name={icon} size={15} color={active ? colors.onPrimary : colors.textMuted} />
      ) : null}
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Avatar({ uri, size = 40 }: { uri: string; size?: number }) {
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceVariant }}
    />
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={typography.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppHeader({
  title,
  avatarUri,
  onMenu,
  right,
}: {
  title: string;
  avatarUri?: string;
  onMenu?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Pressable hitSlop={8} onPress={onMenu} style={styles.headerIconBtn}>
        <Icon name="menu" size={24} color={colors.textMuted} />
      </Pressable>
      <Text style={styles.wordmark}>{title}</Text>
      {right ?? (avatarUri ? <Avatar uri={avatarUri} size={36} /> : <View style={styles.headerIconBtn} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeSolid: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeSolidText: { ...typography.badge, fontSize: 10, color: colors.onPrimary },
  badgeOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.surfaceLowest,
    alignSelf: "flex-start",
  },
  badgeOutlineText: { ...typography.badge, fontSize: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.surfaceLowest, borderWidth: 1, borderColor: colors.sage },
  chipText: { ...typography.badge },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  headerIconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  wordmark: { ...typography.largeTitle, color: colors.primary },
});
