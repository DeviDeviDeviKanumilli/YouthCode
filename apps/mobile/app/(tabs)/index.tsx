import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { MapBackdrop } from '@/components/layout/MapBackdrop';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { getWatchScreen } from '@/api/watch';
import type { GoodPlaceToCheck, WatchItem, WatchScreenResponse } from '@/types/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { FALLBACK_RADIUS_KM, useBackendCoordinates, useLocalArea } from '@/location/LocationProvider';
import { goodPlaceImage, watchItemImage } from '@/lib/images';
import { reportParamsForGoodPlace, reportParamsForWatchItem, watchItemActionHref, watchPlaceActionHref } from '@/lib/watch';

export default function ExploreScreen() {
  const router = useRouter();
  const area = useLocalArea();
  const coords = useBackendCoordinates();
  const [response, setResponse] = useState<WatchScreenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getWatchScreen(coords.lat, coords.lon, FALLBACK_RADIUS_KM)
      .then((data) => {
        setResponse(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load local context.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lon]);

  const regionLabel = area.locationGranted ? area.label : response?.region.label ?? area.label;
  const leadingPlace = response?.goodPlacesToCheck[0];
  const leadingWatch = response?.watchedNearYou[0];

  return (
    <ScreenFrame
      eyebrow="Good afternoon"
      title={regionLabel}
      showTargetButton={false}
      topHeight={420}
      topContent={<MapBackdrop locationLabel={regionLabel} onTargetPress={() => void area.refresh().then(load)} />}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && response !== null} onRefresh={load} />}>
        <SectionHeading
          title="Near you"
          subtitle={response ? `${response.watchedNearYou.length + response.goodPlacesToCheck.length} local signals worth noticing` : 'Loading nearby context'}
        />

        {loading && !response ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingLine} />
            <View style={[styles.loadingLine, { width: '68%' }]} />
          </View>
        ) : null}

        {error && !response ? (
          <StatusPanel title="Could not load Explore" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {leadingPlace ? (
          <ExploreSignalCard
            label="Worth checking"
            icon="water"
            title={leadingPlace.title}
            summary={leadingPlace.summary}
            imageUrl={goodPlaceImage(leadingPlace)}
            tone="place"
            onPress={() => router.push(watchPlaceActionHref(leadingPlace))}
            onReport={() => router.push({ pathname: '/report', params: reportParamsForGoodPlace(leadingPlace) })}
          />
        ) : null}

        {leadingWatch ? (
          <ExploreSignalCard
            label="Notice"
            icon="timeline"
            title={leadingWatch.title}
            summary={leadingWatch.summary}
            imageUrl={watchItemImage(leadingWatch)}
            tone="watch"
            onPress={() => router.push(watchItemActionHref(leadingWatch))}
            onReport={() => router.push({ pathname: '/report', params: reportParamsForWatchItem(leadingWatch) })}
          />
        ) : null}

        <SectionHeading title="Good places to check" />
        {response && response.goodPlacesToCheck.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeRow}>
            {response.goodPlacesToCheck.map((place) => (
              <PlaceTile
                key={place.id}
                place={place}
                onPress={() => router.push(watchPlaceActionHref(place))}
              />
            ))}
          </ScrollView>
        ) : null}
      </ScrollView>
    </ScreenFrame>
  );
}

function ExploreSignalCard({
  label,
  icon,
  title,
  summary,
  imageUrl,
  tone,
  onPress,
  onReport,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  summary: string;
  imageUrl: string;
  tone: 'place' | 'watch';
  onPress: () => void;
  onReport: () => void;
}) {
  const badgeStyle = tone === 'place' ? styles.cardBadge : [styles.cardBadge, styles.noticeBadge];
  const badgeColor = tone === 'place' ? colors.mossDark : '#934934';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={badgeStyle}>
          <MaterialIcons name={icon} size={14} color={badgeColor} />
          <Text style={[styles.cardBadgeText, { color: badgeColor }]}>{label}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onReport} style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}>
          <MaterialIcons name="add-a-photo" size={16} color={colors.white} />
          <Text style={styles.reportText}>Report</Text>
        </Pressable>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSummary}>{summary}</Text>
        </View>
        <Image source={{ uri: imageUrl }} style={styles.cardImage} contentFit="cover" />
      </View>
    </Pressable>
  );
}

function PlaceTile({ place, onPress }: { place: GoodPlaceToCheck; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.placeTile, pressed && styles.pressed]}>
      <Image source={{ uri: goodPlaceImage(place) }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.placeOverlay} />
      <View style={styles.placeBadge}>
        <MaterialIcons name={iconForPlace(place.type)} size={18} color={colors.ink} />
      </View>
      <Text style={styles.placeTitle}>{place.title}</Text>
    </Pressable>
  );
}

function iconForPlace(type: GoodPlaceToCheck['type']) {
  switch (type) {
    case 'creek_edges':
      return 'water';
    case 'trail_entrances':
      return 'hiking';
    case 'park_boundaries':
      return 'park';
    case 'street_trees':
      return 'nature';
    case 'wetland_edges':
      return 'waves';
    case 'garden_edges':
    default:
      return 'yard';
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 18,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 18,
    gap: 10,
  },
  loadingLine: {
    width: '86%',
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceSoft,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  noticeBadge: {
    backgroundColor: colors.amberSoft,
  },
  cardBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reportText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
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
    width: 92,
    height: 92,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  placeRow: {
    gap: 12,
    paddingRight: 8,
  },
  placeTile: {
    width: 168,
    height: 168,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDim,
    justifyContent: 'flex-end',
    padding: 12,
  },
  placeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.42)',
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
