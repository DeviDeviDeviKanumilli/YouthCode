import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <ScreenFrame
      eyebrow="Guide"
      title="Profile"
      regionLabel="Settings and lessons"
      subtitle="Minimal placeholder until auth and profile flows are added."
      topContent={<GuideHero />}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeading title="Start here" subtitle="Short lessons for the mobile app" />
        <GuideCard icon="school" title="What is a habitat?" subtitle="The places and conditions species depend on." />
        <SectionHeading title="Learning paths" />
        <GuideCard
          icon="menu-book"
          title="Places shape species"
          subtitle="Why creeks, trails, parks, and street trees matter."
        />
        <GuideCard
          icon="analytics"
          title="Why one sighting is not a trend"
          subtitle="A good record is useful, but a single upload is not a full picture."
        />
      </ScrollView>
    </ScreenFrame>
  );
}

function GuideCard({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={24} color={colors.moss} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </View>
  );
}

function GuideHero() {
  return (
    <View style={styles.heroWrap}>
      <MaterialIcons name="menu-book" size={46} color="rgba(255,255,255,0.92)" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  cardSubtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

