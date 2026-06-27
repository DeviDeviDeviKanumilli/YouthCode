import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DetailFrame } from '@/components/layout/DetailFrame';
import { MapOverlaySummary } from '@/components/layout/MapOverlaySummary';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { messageForError } from '@/api/client';
import { getWatchItemDetail } from '@/api/watch';
import type { WatchItemDetail as WatchItemDetailType } from '@/types/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { reportParamsForWatchItem, watchItemActionHref } from '@/lib/watch';
import { watchItemImage } from '@/lib/images';

export default function WatchItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<WatchItemDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!id) return;
    setLoading(true);
    getWatchItemDetail(id)
      .then((data) => {
        setItem(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(messageForError(err, 'Unable to load this watch item.'));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <DetailFrame
      title={item?.title ?? 'Watch item'}
      subtitle={item?.label ?? 'Loading details'}
      imageUrl={item ? watchItemImage(item) : null}
      imageAlt={item?.title}
      onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !item ? (
          <StatusPanel title="Loading detail" message="Fetching the backend Watch item detail." />
        ) : null}

        {error && !item ? (
          <StatusPanel title="Could not load detail" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {error && item ? (
          <StatusPanel title="Showing stale detail" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {item ? (
          <>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <MaterialIcons name="eco" size={14} color={colors.mossDark} />
                <Text style={styles.badgeText}>{item.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.surfaceSoft }]}>
                <MaterialIcons name="info-outline" size={14} color={colors.muted} />
                <Text style={[styles.badgeText, { color: colors.muted }]}>{item.localContext.confidenceLabel} confidence</Text>
              </View>
            </View>

            <Text style={styles.explanation}>{item.explanation}</Text>

            <SectionHeading title="Local context" subtitle={item.localContext.summary} />
            <View style={styles.contextCard}>
              <Row label="Recent observations" value={formatOptionalCount(item.localContext.recentObservationCount)} />
              <Row label="Nearest observation" value={formatMeters(item.localContext.nearestObservationMeters)} />
              <Row label="Confidence" value={item.localContext.confidenceLabel} />
            </View>

            <MapOverlaySummary overlay={item.mapOverlay} />

            <SectionHeading title="What to look for" />
            <BulletList items={item.whatToLookFor} />

            <SectionHeading title="Where to look" />
            <BulletList items={item.whereToLook} />

            <SectionHeading title="Photo tips" />
            <BulletList items={item.photoTips} />

            <SectionHeading title="Lookalike notes" />
            <BulletList items={item.lookalikeNotes} />

            <StatusPanel title="Uncertainty notice" message={item.uncertaintyNotice} />

            <View style={styles.actionStack}>
              {item.actions.map((action) => (
                <Pressable
                  key={`${action.type}-${action.label}`}
                  accessibilityRole="button"
                  onPress={() => handleAction(router, item, action.type)}
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
  item: WatchItemDetailType,
  type: string
) {
  switch (type) {
    case 'start_report_with_species':
      router.push({ pathname: '/report', params: reportParamsForWatchItem(item) });
      return;
    case 'view_nearby_signals':
      router.push('/watch');
      return;
    default:
      router.push(watchItemActionHref(item));
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
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

function formatOptionalCount(value: number | null | undefined) {
  if (value == null) return 'Not available';
  return String(value);
}

function formatMeters(value: number | null | undefined) {
  if (value == null) return 'Not available';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }
  return `${value} m`;
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
  explanation: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 2,
  },
  contextCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLabel: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rowValue: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    textAlign: 'right',
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
    backgroundColor: colors.moss,
    marginTop: 7,
  },
  listText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
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
