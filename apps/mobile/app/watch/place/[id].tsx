import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DetailFrame } from '@/components/layout/DetailFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { getWatchPlaceDetail } from '@/api/watch';
import type { GoodPlaceDetail as GoodPlaceDetailType } from '@/types/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { reportParamsForGoodPlace, watchPlaceActionHref } from '@/lib/watch';
import { goodPlaceImage } from '@/lib/images';

export default function WatchPlaceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [place, setPlace] = useState<GoodPlaceDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!id) return;
    setLoading(true);
    getWatchPlaceDetail(id)
      .then((data) => {
        setPlace(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load this place.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <DetailFrame
      title={place?.title ?? 'Good place'}
      subtitle={place?.summary ?? 'Loading details'}
      imageUrl={place ? goodPlaceImage(place) : null}
      imageAlt={place?.title}
      onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !place ? (
          <StatusPanel title="Loading detail" message="Fetching the backend Good Place detail." />
        ) : null}

        {error && !place ? (
          <StatusPanel title="Could not load detail" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {error && place ? (
          <StatusPanel title="Showing stale detail" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {place ? (
          <>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <MaterialIcons name="place" size={14} color={colors.mossDark} />
                <Text style={styles.badgeText}>{place.type}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.surfaceSoft }]}>
                <MaterialIcons name="info-outline" size={14} color={colors.muted} />
                <Text style={[styles.badgeText, { color: colors.muted }]}>Backend-ranked</Text>
              </View>
            </View>

            <Text style={styles.summary}>{place.summary}</Text>
            <Text style={styles.why}>{place.whyItMatters}</Text>

            <SectionHeading title="What to look for" />
            <BulletList items={place.whatToLookFor} />

            <SectionHeading title="Useful photo tips" />
            <BulletList items={place.usefulPhotoTips} />

            <SectionHeading title="Relevant watch items" subtitle="Context from the same area" />
            <View style={styles.watchStack}>
              {place.relevantWatchItems.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.watchCard}>
                  <Text style={styles.watchLabel}>{item.label}</Text>
                  <Text style={styles.watchTitle}>{item.title}</Text>
                  <Text style={styles.watchSummary}>{item.summary}</Text>
                </View>
              ))}
            </View>

            <StatusPanel title="Uncertainty notice" message={place.uncertaintyNotice} />

            <View style={styles.actionStack}>
              {place.actions.map((action) => (
                <Pressable
                  key={`${action.type}-${action.label}`}
                  accessibilityRole="button"
                  onPress={() => handleAction(router, place, action.type)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <Text style={styles.actionButtonText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </DetailFrame>
  );
}

function handleAction(
  router: ReturnType<typeof useRouter>,
  place: GoodPlaceDetailType,
  type: string
) {
  switch (type) {
    case 'start_report_with_place_context':
      router.push({ pathname: '/report', params: reportParamsForGoodPlace(place) });
      return;
    default:
      router.push(watchPlaceActionHref(place));
  }
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <View style={styles.bullet} />
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: colors.mossSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summary: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 24,
  },
  why: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  list: {
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.amber,
    marginTop: 7,
  },
  listText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  watchStack: {
    gap: 10,
  },
  watchCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 4,
  },
  watchLabel: {
    color: colors.moss,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  watchTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  watchSummary: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  actionStack: {
    gap: 10,
    paddingTop: 4,
  },
  actionButton: {
    borderRadius: 999,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionButtonText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.86,
  },
});
