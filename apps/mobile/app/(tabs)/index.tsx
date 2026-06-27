import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { MapBackdrop } from '@/components/layout/MapBackdrop';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';

export default function ExploreScreen() {
  return (
    <ScreenFrame
      eyebrow="Good afternoon"
      title="Explore"
      regionLabel="Princeton, NJ"
      subtitle="A field view for local signals, sampling gaps, and nearby context."
      topContent={<MapBackdrop locationLabel="Princeton, NJ" demoLabel="Map preview" />}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeading title="Near you" subtitle="A few local signals worth noticing" />
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardBadge}>
              <MaterialIcons name="eco" size={14} color={colors.mossDark} />
              <Text style={styles.cardBadgeText}>Worth checking</Text>
            </View>
            <MaterialIcons name="more-horiz" size={20} color={colors.muted} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Creek edges nearby are undersampled</Text>
              <Text style={styles.cardSummary}>
                A few clear photos from this area could help show what species are present.
              </Text>
            </View>
            <View style={styles.cardImage}>
              <MaterialIcons name="water" size={28} color={colors.moss} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.cardBadge, { backgroundColor: colors.amberSoft }]}>
              <MaterialIcons name="timeline" size={14} color="#934934" />
              <Text style={[styles.cardBadgeText, { color: '#934934' }]}>Notice</Text>
            </View>
            <MaterialIcons name="more-horiz" size={20} color={colors.muted} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Spotted lanternfly sightings nearby</Text>
              <Text style={styles.cardSummary}>
                Multiple observations have been submitted within 2 miles this week.
              </Text>
            </View>
            <View style={styles.cardImage}>
              <MaterialIcons name="search" size={28} color={colors.amber} />
            </View>
          </View>
        </View>

        <SectionHeading title="Good places to check" subtitle="Static preview until map layers land" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeRow}>
          <PlaceTile icon="water" title="Creek edges" />
          <PlaceTile icon="hiking" title="Trail entrances" />
          <PlaceTile icon="park" title="Park boundaries" />
          <PlaceTile icon="nature" title="Street trees" />
        </ScrollView>
      </ScrollView>
    </ScreenFrame>
  );
}

function PlaceTile({ icon, title }: { icon: keyof typeof MaterialIcons.glyphMap; title: string }) {
  return (
    <View style={styles.placeTile}>
      <View style={styles.placeOverlay} />
      <View style={styles.placeBadge}>
        <MaterialIcons name={icon} size={18} color={colors.ink} />
      </View>
      <Text style={styles.placeTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.mossSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cardBadgeText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
    lineHeight: 22,
  },
  cardSummary: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeRow: {
    gap: 12,
    paddingRight: 8,
  },
  placeTile: {
    width: 160,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDim,
    justifyContent: 'flex-end',
    padding: 12,
  },
  placeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  placeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTitle: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 22,
  },
});
