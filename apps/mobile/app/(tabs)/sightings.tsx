import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { messageForError } from '@/api/client';
import { getUserObservations } from '@/api/users';
import { resolveApiUrl } from '@/api/client';
import { useLocalUser } from '@/user/UserProvider';
import type { UserObservationListItem } from '@/types/user';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';
import { watchItemImage } from '@/lib/images';

export default function SightingsScreen() {
  const router = useRouter();
  const user = useLocalUser();
  const [items, setItems] = useState<UserObservationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!user.userId) return;
    setLoading(true);
    getUserObservations(user.userId)
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(messageForError(err, 'Unable to load sightings.'));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user.ready) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.ready, user.userId]);

  return (
    <ScreenFrame
      eyebrow="Field notes"
      title="Sightings"
      regionLabel="Your observations"
      subtitle={user.userId ? 'Submitted sightings and draft field notes.' : 'Preparing your local user session.'}
      topContent={<PlaceholderHero />}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <View style={styles.statsRow}>
          <MiniStat icon="eco" value={String(items.length)} label="submitted" />
          <MiniStat icon="schedule" value={String(items.filter((item) => item.verification_status !== 'reviewed').length)} label="awaiting review" />
          <MiniStat icon="location-on" value={String(items.length > 0 ? 1 : 0)} label="filled gaps" />
        </View>

        <SectionHeading title="Recent notes" subtitle="Your uploaded sightings from this device." />

        {loading && items.length === 0 ? (
          <StatusPanel title="Loading sightings" message="Fetching your observation list from the backend." />
        ) : null}

        {error ? (
          <StatusPanel title="Could not load sightings" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {!loading && items.length === 0 ? (
          <StatusPanel
            title="No sightings yet"
            message="Use the plus button to capture your first sighting and it will appear here."
            actionLabel="Open report"
            onActionPress={() => router.push('/report')}
          />
        ) : null}

        <View style={styles.noteStack}>
          {items.map((item) => (
            <Pressable
              key={item.observation_id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/sightings/[id]',
                  params: { id: item.observation_id },
                })
              }
              style={({ pressed }) => [styles.noteCard, pressed && styles.pressed]}>
              <Image
                source={{
                  uri:
                    resolveApiUrl(item.thumbnail_url) ??
                    watchItemImage({ title: item.possible_species ?? 'Observation', type: 'species_watch', imageUrl: null }),
                }}
                style={styles.noteImage}
                contentFit="cover"
              />
              <View style={styles.noteCopy}>
                <View style={styles.noteHead}>
                  <Text style={styles.noteTitle}>{item.possible_species ?? 'Unidentified sighting'}</Text>
                  <Text style={styles.noteTag}>{item.verification_status}</Text>
                </View>
                <Text style={styles.noteBody}>
                  {item.signal_label ? `${item.signal_label} • ` : ''}
                  {formatDate(item.created_at)}
                </Text>
                <Text style={styles.noteHint}>Open intelligence card</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/report', params: { source: 'sighting_history', observationId: item.observation_id } })}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Text style={styles.secondaryButtonText}>Create follow-up report</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
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
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  noteStack: {
    gap: 12,
  },
  noteImage: {
    width: 96,
    minHeight: 122,
    backgroundColor: colors.surfaceDim,
  },
  noteCopy: {
    flex: 1,
    padding: 14,
    gap: 6,
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
  noteHint: {
    color: colors.blue,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
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
