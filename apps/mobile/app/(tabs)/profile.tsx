import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';
import { systemStatusDetail, systemStatusTone, systemStatusValue } from '@/lib/systemStatus';
import { useLocalArea } from '@/location/LocationProvider';
import { useSystemStatus } from '@/system/SystemStatusProvider';
import { useLocalUser } from '@/user/UserProvider';

export default function ProfileScreen() {
  const area = useLocalArea();
  const systemStatus = useSystemStatus();
  const user = useLocalUser();

  return (
    <ScreenFrame
      eyebrow="Field profile"
      title="Profile"
      regionLabel={area.label}
      subtitle="Session, permissions, and field learning."
      topContent={<GuideHero />}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeading title="Device session" subtitle="Backend integration status for this app." />
        <StatusCard
          icon="cloud-done"
          title="EcoSentinel API"
          value={systemStatusValue(systemStatus)}
          detail={systemStatusDetail(systemStatus)}
          tone={systemStatusTone(systemStatus)}
          actionLabel="Retry"
          onActionPress={() => void systemStatus.refresh()}
        />
        <StatusCard
          icon="person"
          title="Observer session"
          value={user.ready && user.userId ? 'Ready' : user.ready ? 'Unavailable' : 'Preparing'}
          detail={user.error ?? (user.userId ? `Anonymous user ${user.userId.slice(0, 8)}` : 'Creating local observer session')}
          tone={user.error ? 'error' : 'ok'}
          actionLabel="Refresh"
          onActionPress={() => void user.refresh()}
        />
        <StatusCard
          icon="my-location"
          title="Location"
          value={area.locationGranted ? 'Enabled' : 'Approximate'}
          detail={area.error ?? area.label}
          tone={area.error ? 'warning' : 'ok'}
          actionLabel="Refresh"
          onActionPress={() => void area.refresh()}
        />

        <SectionHeading title="Start here" subtitle="Short lessons for field observations." />
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

function StatusCard({
  icon,
  title,
  value,
  detail,
  tone,
  actionLabel,
  onActionPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value: string;
  detail: string;
  tone: 'ok' | 'warning' | 'error';
  actionLabel: string;
  onActionPress: () => void;
}) {
  const toneColor = tone === 'error' ? '#B6473D' : tone === 'warning' ? colors.amber : colors.moss;
  return (
    <View style={styles.statusCard}>
      <View style={[styles.iconWrap, { backgroundColor: tone === 'error' ? '#F4D8D4' : colors.mossSoft }]}>
        <MaterialIcons name={icon} size={22} color={toneColor} />
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.statusHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.statusValue, { color: toneColor }]}>{value}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{detail}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onActionPress} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text style={styles.retryButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
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
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusValue: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  retryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
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
  pressed: {
    opacity: 0.84,
  },
});
