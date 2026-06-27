import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DetailFrame } from '@/components/layout/DetailFrame';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string | string[];
    watchItemId?: string | string[];
    suggestedSpeciesId?: string | string[];
    suggestedSpeciesName?: string | string[];
    placeId?: string | string[];
    placeType?: string | string[];
    habitatHint?: string | string[];
  }>();

  return (
    <DetailFrame
      title="New sighting"
      subtitle="Prefilled from Watch"
      onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusPanel
          title="Report context received"
          message="The fields below reflect the Watch action that opened this screen. They are ready for editing."
        />

        <View style={styles.card}>
          <MetaRow icon="source" label="Source" value={readParam(params.source) ?? 'Unknown'} />
          <MetaRow icon="sd-card" label="Watch item id" value={readParam(params.watchItemId) ?? 'Not provided'} />
          <MetaRow
            icon="eco"
            label="Suggested species"
            value={readParam(params.suggestedSpeciesName) ?? 'Not provided'}
          />
          <MetaRow
            icon="fingerprint"
            label="Suggested species id"
            value={readParam(params.suggestedSpeciesId) ?? 'Not provided'}
          />
          <MetaRow icon="place" label="Place id" value={readParam(params.placeId) ?? 'Not provided'} />
          <MetaRow icon="terrain" label="Place type" value={readParam(params.placeType) ?? 'Not provided'} />
          <MetaRow icon="water" label="Habitat hint" value={readParam(params.habitatHint) ?? 'Not provided'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What happens next</Text>
          <Text style={styles.cardBody}>
            This placeholder is wired so the backend-supplied Watch context can be carried into the
            real capture flow later. The path and parameters are already in place.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/watch')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <MaterialIcons name="map" size={18} color={colors.white} />
            <Text style={styles.primaryText}>Return to Watch</Text>
          </Pressable>
        </View>
      </ScrollView>
    </DetailFrame>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaIcon}>
        <MaterialIcons name={icon} size={16} color={colors.moss} />
      </View>
      <View style={styles.metaCopy}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 20,
  },
  cardBody: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCopy: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.86,
  },
});
