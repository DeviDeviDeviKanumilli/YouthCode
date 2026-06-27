import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DetailFrame } from '@/components/layout/DetailFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import {
  getIntelligenceCard,
  getObservation,
  getObservationMedia,
  getObservationPipelineStatus,
} from '@/api/observations';
import type { MediaRead, ObservationRead, PipelineStatusResponse, SightingIntelligenceCard } from '@/types/report';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export default function ObservationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [observation, setObservation] = useState<ObservationRead | null>(null);
  const [media, setMedia] = useState<MediaRead[]>([]);
  const [card, setCard] = useState<SightingIntelligenceCard | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!id) {
      return;
    }

    setLoading(true);
    Promise.all([getObservation(id), getObservationMedia(id), getIntelligenceCard(id), getObservationPipelineStatus(id)])
      .then(([nextObservation, nextMedia, nextCard, nextPipeline]) => {
        setObservation(nextObservation);
        setMedia(nextMedia);
        setCard(nextCard);
        setPipeline(nextPipeline);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load this observation.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const coverImage = media[0]?.public_url ?? null;
  const title = card?.possible_species?.common_name ?? observation?.raw_note?.trim() ?? 'Observation';
  const subtitle = useMemo(() => {
    if (!observation) {
      return 'Loading observation details';
    }
    const location = [formatCoordinate(observation.latitude), formatCoordinate(observation.longitude)].join(', ');
    return `${formatDateTime(observation.created_at)} • ${location}`;
  }, [observation]);

  return (
    <DetailFrame
      title={title}
      subtitle={subtitle}
      imageUrl={coverImage}
      imageAlt={card?.possible_species?.common_name ?? observation?.raw_note ?? 'Observation photo'}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sightings')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <MaterialIcons name="format-list-bulleted" size={18} color={colors.white} />
        </Pressable>
      }
      onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !observation ? (
          <StatusPanel title="Loading observation" message="Fetching the saved record, analysis card, and pipeline status." />
        ) : null}

        {error && !observation ? (
          <StatusPanel title="Could not load observation" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {observation ? (
          <>
            <View style={styles.metaRow}>
              <MetaPill icon="place" label={observation.region_code ?? 'Local observation'} value={observation.privacy_level} />
              <MetaPill icon="schedule" label="Submitted" value={formatDateTime(observation.created_at)} />
            </View>

            <SectionHeading title="Field details" subtitle="The original report data stays editable through a follow-up report." />
            <View style={styles.detailCard}>
              <DetailRow label="Source" value={observation.source} />
              <DetailRow label="Latitude" value={formatCoordinate(observation.latitude, 5)} />
              <DetailRow label="Longitude" value={formatCoordinate(observation.longitude, 5)} />
              <DetailRow label="Coordinate uncertainty" value={formatDistance(observation.coordinate_uncertainty_m)} />
              <DetailRow label="Privacy" value={observation.privacy_level} />
              <DetailRow label="Region code" value={observation.region_code ?? 'Not set'} />
            </View>

            <SectionHeading title="Habitat answers" />
            <View style={styles.answerGrid}>
              {renderHabitatAnswers(observation.habitat_answers).map((answer) => (
                <View key={answer.label} style={styles.answerCard}>
                  <Text style={styles.answerLabel}>{answer.label}</Text>
                  <Text style={styles.answerValue}>{answer.value}</Text>
                </View>
              ))}
            </View>

            {observation.raw_note ? (
              <>
                <SectionHeading title="Field note" />
                <View style={styles.noteCard}>
                  <Text style={styles.noteText}>{observation.raw_note}</Text>
                </View>
              </>
            ) : null}

            {card ? (
              <>
                <SectionHeading title="Sighting intelligence" subtitle={card.signal_label ?? 'Backend summary'} />
                <View style={styles.signalCard}>
                  <View style={styles.signalTopRow}>
                    <View style={styles.signalBadge}>
                      <MaterialIcons name="eco" size={16} color={colors.mossDark} />
                      <Text style={styles.signalBadgeText}>{card.verification_status}</Text>
                    </View>
                    <View style={styles.signalBadgeMuted}>
                      <Text style={styles.signalBadgeMutedText}>{card.local_status}</Text>
                    </View>
                  </View>
                  <Text style={styles.signalTitle}>
                    {card.possible_species?.common_name ?? card.possible_species?.scientific_name ?? 'Possible species not yet resolved'}
                  </Text>
                  <Text style={styles.signalBody}>{card.plain_language_explanation}</Text>
                  <InlineFact label="Confidence" value={formatConfidence(card.confidence_label)} />
                  <InlineFact label="Nearby records" value={card.known_nearby_records_summary} />
                  <InlineFact label="Habitat match" value={card.habitat_match_summary} />
                  <InlineFact label="Pathway context" value={card.pathway_summary} />
                  <InlineFact label="Sampling value" value={card.sampling_value_summary} />
                  <InlineFact label="Uncertainty" value={card.uncertainty_notice} />
                </View>
              </>
            ) : null}

            {pipeline ? (
              <>
                <SectionHeading title="Pipeline status" subtitle="What the backend has completed so far." />
                <View style={styles.detailCard}>
                  <DetailRow label="Current status" value={pipeline.current_status} />
                  <DetailRow label="Next user action" value={pipeline.next_available_user_action} />
                  <DetailRow label="Completed steps" value={pipeline.completed_steps.length > 0 ? pipeline.completed_steps.join(' • ') : 'None yet'} />
                  <DetailRow
                    label="Failed steps"
                    value={
                      pipeline.failed_steps.length > 0
                        ? pipeline.failed_steps.map((step) => `${step.name}${step.error ? `: ${step.error}` : ''}`).join(' • ')
                        : 'None'
                    }
                  />
                </View>
              </>
            ) : null}

            {card?.data_sources_used?.length ? (
              <>
                <SectionHeading title="Data sources used" />
                <View style={styles.chipRow}>
                  {card.data_sources_used.map((source) => (
                    <View key={source} style={styles.chip}>
                      <Text style={styles.chipText}>{source}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.actionStack}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/report', params: { source: 'observation_detail', observationId: observation.id } })}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Create follow-up report</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/sightings')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Back to Sightings</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/watch')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Open Watch</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </DetailFrame>
  );
}

function MetaPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaPill}>
      <MaterialIcons name={icon} size={16} color={colors.mossDark} />
      <View style={styles.metaPillCopy}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineFact}>
      <Text style={styles.inlineFactLabel}>{label}</Text>
      <Text style={styles.inlineFactValue}>{value}</Text>
    </View>
  );
}

function renderHabitatAnswers(answers: Record<string, unknown>) {
  const entries = Object.entries(answers);
  if (entries.length === 0) {
    return [{ label: 'No habitat answers', value: 'Not provided' }];
  }

  return entries.map(([key, value]) => ({
    label: humanizeKey(key),
    value: formatAnswerValue(value),
  }));
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatAnswerValue(value: unknown) {
  if (value == null) {
    return 'Not sure';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Not sure';
  }
  return String(value);
}

function formatConfidence(value?: string | null) {
  if (!value) {
    return 'Not available';
  }
  return value.replace(/_/g, ' ');
}

function formatDistance(value?: number | string | null) {
  if (value == null) {
    return 'Not available';
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(parsed)) {
    return String(value);
  }
  if (parsed >= 1000) {
    return `${(parsed / 1000).toFixed(1)} km`;
  }
  return `${parsed} m`;
}

function formatCoordinate(value: number | string, digits = 4) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(parsed)) {
    return String(value);
  }
  return parsed.toFixed(digits);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaPill: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 12,
  },
  metaPillCopy: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailValue: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    textAlign: 'right',
  },
  answerGrid: {
    gap: 10,
  },
  answerCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 4,
  },
  answerLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  answerValue: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
  },
  noteText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  signalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
    gap: 10,
  },
  signalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mossSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalBadgeMuted: {
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalBadgeText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  signalBadgeMutedText: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  signalTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
  },
  signalBody: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  inlineFact: {
    gap: 4,
    paddingTop: 4,
  },
  inlineFactLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inlineFactValue: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.ink,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actionStack: {
    gap: 10,
    paddingTop: 4,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
});
