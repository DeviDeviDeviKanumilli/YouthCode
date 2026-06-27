import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { mapOverlayDisplay } from '@/lib/mapOverlay';
import type { WatchMapOverlay } from '@/types/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export function MapOverlaySummary({ overlay }: { overlay: WatchMapOverlay | null | undefined }) {
  const display = mapOverlayDisplay(overlay);
  if (!display) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="map" size={19} color={colors.mossDark} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Map context</Text>
          <Text style={styles.title}>{display.title}</Text>
        </View>
      </View>
      <Text style={styles.summary}>{display.summary}</Text>
      <View style={styles.pillRow}>
        <EvidencePill label="Geometry" enabled={display.hasGeometry} />
        <EvidencePill label="Record points" enabled={display.hasPoints} />
      </View>
    </View>
  );
}

function EvidencePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={[styles.pill, !enabled && styles.pillMuted]}>
      <MaterialIcons
        name={enabled ? 'check-circle' : 'radio-button-unchecked'}
        size={14}
        color={enabled ? colors.mossDark : colors.muted}
      />
      <Text style={[styles.pillText, !enabled && styles.pillTextMuted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  summary: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: colors.mossSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pillMuted: {
    backgroundColor: colors.surfaceSoft,
  },
  pillText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  pillTextMuted: {
    color: colors.muted,
  },
});
