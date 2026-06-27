import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { MapBackdrop } from '@/components/layout/MapBackdrop';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { GoodPlaceCard } from '@/components/cards/GoodPlaceCard';
import { WatchItemCard } from '@/components/cards/WatchItemCard';
import { getWatchScreen } from '@/api/watch';
import type { GoodPlaceToCheck, WatchItem, WatchScreenResponse } from '@/types/watch';
import {
  formatUpdatedAt,
  reportParamsForGoodPlace,
  reportParamsForWatchItem,
  watchItemActionHref,
  watchPlaceActionHref,
} from '@/lib/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { FALLBACK_RADIUS_KM, useBackendCoordinates, useLocalArea } from '@/location/LocationProvider';

export default function WatchScreen() {
  const router = useRouter();
  const area = useLocalArea();
  const coords = useBackendCoordinates();
  const [response, setResponse] = useState<WatchScreenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    const initialLoad = response === null;
    setLoading(true);
    if (initialLoad) {
      setError(null);
    }

    getWatchScreen(coords.lat, coords.lon, FALLBACK_RADIUS_KM)
      .then((data) => {
        setResponse(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to load watch data.';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lon]);

  const regionLabel = area.locationGranted ? area.label : response?.region.label ?? area.label;
  const updatedAt = response ? formatUpdatedAt(response.updatedAt) : 'Updating local signals';

  return (
    <ScreenFrame
      eyebrow="Good afternoon"
      title="Watch"
      regionLabel={regionLabel}
      subtitle={area.locationGranted ? 'Things worth noticing nearby' : 'Enable location to rank signals around you.'}
      topHeight={300}
      topContent={<MapBackdrop locationLabel={regionLabel} onTargetPress={() => void area.refresh().then(load)} />}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && response !== null} onRefresh={load} />}
      >
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Region</Text>
            <Text style={styles.metaValue}>{regionLabel}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Radius</Text>
            <Text style={styles.metaValue}>{response?.region.radiusKm ?? FALLBACK_RADIUS_KM} km</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Updated</Text>
            <Text style={styles.metaValue}>{updatedAt}</Text>
          </View>
        </View>

        {loading && response === null ? (
          <View style={styles.skeletonStack}>
            <SkeletonWatchCard />
            <SkeletonWatchCard />
            <SkeletonPlaceRow />
          </View>
        ) : null}

        {error && response === null ? (
          <StatusPanel title="Could not load Watch" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {error && response ? (
          <StatusPanel
            title="Watch is using stale data"
            message={error}
            actionLabel="Retry"
            onActionPress={load}
            tone="error"
          />
        ) : null}

        {response?.emptyState ? (
          <StatusPanel
            title={response.emptyState.title}
            message={response.emptyState.message}
            actionLabel={response.emptyState.actionLabel ?? 'Open report'}
            onActionPress={() => router.push('/report')}
          />
        ) : null}

        <SectionHeading
          title="Watched near you"
          subtitle="Local signals from the backend"
          accessory={response ? `${response.watchedNearYou.length} items` : undefined}
        />

        {response && response.watchedNearYou.length > 0 ? (
          <View style={styles.itemStack}>
            {response.watchedNearYou.map((item) => (
              <WatchItemCard
                key={item.id}
                item={item}
                onOpenDetail={() => router.push(watchItemActionHref(item))}
                onPrimaryAction={() => handleWatchItemAction(router, item)}
              />
            ))}
          </View>
        ) : null}

        {response && response.watchedNearYou.length === 0 && !response.emptyState ? (
          <StatusPanel
            title="No watched signals yet"
            message="The backend returned no watch cards for this area."
            actionLabel="Retry"
            onActionPress={load}
          />
        ) : null}

        <SectionHeading
          title="Good places to check"
          subtitle="Places the backend thinks are worth a look"
          accessory={response ? `${response.goodPlacesToCheck.length} places` : undefined}
        />

        {response && response.goodPlacesToCheck.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeRow}>
            {response.goodPlacesToCheck.map((place) => (
              <GoodPlaceCard
                key={place.id}
                place={place}
                onOpenDetail={() => router.push(watchPlaceActionHref(place))}
                onPrimaryAction={() => handleGoodPlaceAction(router, place)}
              />
            ))}
          </ScrollView>
        ) : null}

        {response && response.goodPlacesToCheck.length === 0 ? (
          <StatusPanel
            title="No places returned"
            message="Try again or wait for more local context to seed."
            actionLabel="Retry"
            onActionPress={load}
          />
        ) : null}

        <View style={styles.footerNote}>
          <MaterialIcons name="info-outline" size={16} color={colors.muted} />
          <Text style={styles.footerNoteText}>
            Clear photos and location context help the review workflow, but nothing here is a confirmation.
          </Text>
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}

function handleWatchItemAction(router: ReturnType<typeof useRouter>, item: WatchItem) {
  switch (item.nextAction.type) {
    case 'start_report_with_species':
      router.push({ pathname: '/report', params: reportParamsForWatchItem(item) });
      return;
    case 'view_nearby_signals':
      router.push('/watch');
      return;
    case 'open_watch_detail':
    default:
      router.push(watchItemActionHref(item));
  }
}

function handleGoodPlaceAction(router: ReturnType<typeof useRouter>, place: GoodPlaceToCheck) {
  switch (place.nextAction.type) {
    case 'start_report_with_place_context':
      router.push({ pathname: '/report', params: reportParamsForGoodPlace(place) });
      return;
    case 'open_watch_detail':
    default:
      router.push(watchPlaceActionHref(place));
  }
}

function SkeletonWatchCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTextWrap}>
        <View style={styles.skeletonBadge} />
        <View style={styles.skeletonLineLong} />
        <View style={styles.skeletonLineMid} />
        <View style={styles.skeletonChipRow}>
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
        </View>
      </View>
      <View style={styles.skeletonImage} />
    </View>
  );
}

function SkeletonPlaceRow() {
  return (
    <View style={styles.skeletonPlaceRow}>
      <View style={styles.skeletonPlaceCard} />
      <View style={styles.skeletonPlaceCard} />
      <View style={styles.skeletonPlaceCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaBlock: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 12,
    gap: 4,
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
    fontSize: 13,
    lineHeight: 18,
  },
  itemStack: {
    gap: 12,
  },
  placeRow: {
    gap: 12,
    paddingRight: 8,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingBottom: 20,
  },
  footerNoteText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  skeletonStack: {
    gap: 12,
  },
  skeletonCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
  },
  skeletonTextWrap: {
    flex: 1,
    gap: 10,
  },
  skeletonBadge: {
    width: 90,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
  },
  skeletonLineLong: {
    width: '92%',
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceSoft,
  },
  skeletonLineMid: {
    width: '76%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceSoft,
  },
  skeletonChipRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  skeletonChip: {
    width: 56,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
  },
  skeletonImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
  },
  skeletonPlaceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonPlaceCard: {
    width: 164,
    height: 164,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
  },
});
