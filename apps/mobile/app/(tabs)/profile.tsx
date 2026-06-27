import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <ScreenFrame
      eyebrow="Guide"
      title="Profile"
      regionLabel="Settings and lessons"
      subtitle="Short routes into the main product flows and the ecology language used across the app."
      topContent={<GuideHero />}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeading title="Start here" subtitle="Short lessons for the mobile app" />
        <GuideCard
          icon="school"
          title="What is a habitat?"
          subtitle="The places and conditions species depend on."
          onPress={() => router.push('/watch')}
        />
        <SectionHeading title="Learning paths" />
        <GuideCard
          icon="menu-book"
          title="Places shape species"
          subtitle="Why creeks, trails, parks, and street trees matter."
          onPress={() => router.push('/watch')}
        />
        <GuideCard
          icon="analytics"
          title="Why one sighting is not a trend"
          subtitle="A good record is useful, but a single upload is not a full picture."
          onPress={() => router.push('/sightings')}
        />
        <SectionHeading title="Quick actions" />
        <GuideCard
          icon="photo-camera"
          title="Capture a new sighting"
          subtitle="Open the camera flow and attach habitat clues."
          onPress={() => router.push('/report')}
        />
        <GuideCard
          icon="search"
          title="Open Watch"
          subtitle="See what the backend ranked near you right now."
          onPress={() => router.push('/watch')}
        />
      </ScrollView>
    </ScreenFrame>
  );
}

function GuideCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={24} color={colors.moss} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function GuideHero() {
  return (
    <View style={styles.heroWrap}>
      <MaterialIcons name="menu-book" size={46} color="rgba(255,255,255,0.92)" />
      <Text style={styles.heroTitle}>Ecology guide</Text>
      <Text style={styles.heroBody}>Keep the language grounded: possible, needs verification, and high-value signal.</Text>
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
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
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
    paddingHorizontal: 20,
    gap: 8,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 18,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
