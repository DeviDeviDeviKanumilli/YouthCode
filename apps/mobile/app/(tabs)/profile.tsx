import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';
import { locationStatusDetail } from '@/lib/locationDisplay';
import { systemStatusDetail, systemStatusTone, systemStatusValue } from '@/lib/systemStatus';
import { userDisplayName, userPrivacySummary, userRoleLabel } from '@/lib/userProfile';
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
          detail={
            user.error ??
            (user.userId
              ? `${userDisplayName(user.user)} · ${userRoleLabel(user.user)} · ${user.userId.slice(0, 8)}`
              : 'Creating local observer session')
          }
          tone={user.error ? 'error' : 'ok'}
          actionLabel="Refresh"
          onActionPress={() => void user.refresh()}
        />
        <StatusCard
          icon="privacy-tip"
          title="Backend privacy"
          value={userRoleLabel(user.user)}
          detail={
            user.user?.trusted_reviewer_status
              ? `${userPrivacySummary(user.user)} Trusted reviewer enabled.`
              : userPrivacySummary(user.user)
          }
          tone="ok"
          actionLabel="Refresh"
          onActionPress={() => void user.refresh()}
        />
        <StatusCard
          icon="my-location"
          title="Location"
          value={area.locationGranted ? 'Enabled' : 'Approximate'}
          detail={locationStatusDetail({
            granted: area.locationGranted,
            label: area.label,
            error: area.error,
          })}
          tone={area.error ? 'warning' : 'ok'}
          actionLabel="Refresh"
          onActionPress={() => void area.refresh()}
        />

        <SectionHeading title="Start here" subtitle="Short lessons for field observations." />
        <GuideCard
          icon="school"
          title="What is a habitat?"
          subtitle="The places and conditions species depend on."
          accent="moss"
        />
        <SectionHeading title="Learning paths" />
        <GuideCard
          icon="menu-book"
          title="Places shape species"
          subtitle="Why creeks, trails, parks, and street trees matter."
          accent="blue"
        />
        <GuideCard
          icon="analytics"
          title="Why one sighting is not a trend"
          subtitle="A good record is useful, but a single upload is not a full picture."
          accent="amber"
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
  accent = 'moss',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  accent?: 'moss' | 'blue' | 'amber';
}) {
  const accentStyles = {
    moss: { iconBg: colors.mossSoft, iconColor: colors.moss, border: colors.mossSoft },
    blue: { iconBg: colors.blueSoft, iconColor: colors.blue, border: '#D6E2F8' },
    amber: { iconBg: colors.amberSoft, iconColor: colors.amber, border: '#F2D8CF' },
  }[accent];

  return (
    <View style={[styles.card, { borderColor: accentStyles.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: accentStyles.iconBg }]}>
        <MaterialIcons name={icon} size={24} color={accentStyles.iconColor} />
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
      <LinearGradient
        colors={['rgba(79,107,82,0.42)', 'rgba(7,17,13,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroBadge}>
        <MaterialIcons name="menu-book" size={28} color={colors.white} />
      </View>
      <Text style={styles.heroTitle}>Field guide</Text>
      <Text style={styles.heroSubtitle}>Short lessons for careful observations.</Text>
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
    gap: 10,
    paddingHorizontal: 24,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroTitle: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  pressed: {
    opacity: 0.84,
  },
});
