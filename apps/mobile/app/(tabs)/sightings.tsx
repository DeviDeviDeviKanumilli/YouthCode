import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';

export default function SightingsScreen() {
  return (
    <ScreenFrame
      eyebrow="Field notes"
      title="Sightings"
      regionLabel="Your observations"
      subtitle="Submitted sightings and draft field notes."
      topContent={<PlaceholderHero />}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <MiniStat icon="eco" value="12" label="submitted" />
          <MiniStat icon="schedule" value="3" label="awaiting review" />
          <MiniStat icon="location-on" value="2" label="filled gaps" />
        </View>

        <SectionHeading title="Recent notes" subtitle="Placeholder entries until the real feed is wired." />

        <StatusPanel
          title="No live sightings feed yet"
          message="This tab is wired for the future field-note list, but it is still a placeholder in this migration."
          actionLabel="Open Watch"
        />

        <View style={styles.noteCard}>
          <View style={styles.noteHead}>
            <Text style={styles.noteTitle}>Possible Japanese knotweed</Text>
            <Text style={styles.noteTag}>Needs review</Text>
          </View>
          <Text style={styles.noteBody}>Near creek edge • Jun 26</Text>
        </View>

        <View style={styles.noteCard}>
          <View style={styles.noteHead}>
            <Text style={styles.noteTitle}>Spotted lanternfly</Text>
            <Text style={styles.noteTag}>Reviewed</Text>
          </View>
          <Text style={styles.noteBody}>Street tree • Jun 19</Text>
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialIcons name={icon} size={18} color={colors.moss} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PlaceholderHero() {
  return (
    <View style={styles.heroWrap}>
      <MaterialIcons name="feed" size={48} color="rgba(255,255,255,0.9)" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 4,
  },
  noteHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  noteTag: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noteBody: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

