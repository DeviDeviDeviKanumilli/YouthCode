import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DetailFrame } from '@/components/layout/DetailFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { messageForError } from '@/api/client';
import { getObservationAssistantContext } from '@/api/assistant';
import { getIntelligenceCard, getObservation, getObservationMedia } from '@/api/observations';
import { firstAllowedClaims, summarizeObservationAssistantContext } from '@/lib/assistantContext';
import type { MediaRead, ObservationRead, SightingIntelligenceCard } from '@/types/report';
import type { ObservationAssistantContext } from '@/types/assistant';
import { intelligenceCardTitle, signalPriorityDisplay } from '@/lib/intelligenceCard';
import { firstEvidenceImageUrl, mediaEvidenceSummary } from '@/lib/mediaEvidence';
import {
  coordinateUncertaintyLabel,
  habitatAnswerCount,
  observationDateLabel,
  observationPrivacyLabel,
} from '@/lib/observationMetadata';
import { watchItemImage } from '@/lib/images';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export default function SightingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<SightingIntelligenceCard | null>(null);
  const [observation, setObservation] = useState<ObservationRead | null>(null);
  const [media, setMedia] = useState<MediaRead[]>([]);
  const [assistantContext, setAssistantContext] = useState<ObservationAssistantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observationError, setObservationError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getIntelligenceCard(id);
      setCard(data);
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load this intelligence card.'));
    } finally {
      setLoading(false);
    }

    try {
      const metadata = await getObservation(id);
      setObservation(metadata);
      setObservationError(null);
    } catch (err) {
      setObservationError(messageForError(err, 'Unable to load submitted record metadata.'));
    }

    try {
      const evidence = await getObservationMedia(id);
      setMedia(evidence);
      setMediaError(null);
    } catch (err) {
      setMediaError(messageForError(err, 'Unable to load evidence media.'));
    }

    try {
      const context = await getObservationAssistantContext(id);
      setAssistantContext(context);
      setAssistantError(null);
    } catch (err) {
      setAssistantError(messageForError(err, 'Unable to load grounded assistant context.'));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const possibleName = intelligenceCardTitle(card);
  const evidenceImageUrl =
    firstEvidenceImageUrl(media) ?? watchItemImage({ title: possibleName, type: 'species_watch', imageUrl: null });

  return (
    <DetailFrame
      title={possibleName}
      subtitle="Sighting Intelligence Card"
      imageUrl={evidenceImageUrl}
      imageAlt={possibleName}
      onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !card ? (
          <StatusPanel title="Loading intelligence card" message="Fetching backend ecological context for this sighting." />
        ) : null}

        {error && !card ? (
          <StatusPanel title="Could not load card" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {error && card ? (
          <StatusPanel title="Showing stale card" message={error} actionLabel="Retry" onActionPress={load} tone="error" />
        ) : null}

        {card ? (
          <>
            <View style={styles.badgeRow}>
              <Badge icon="eco" label={card.confidence_label ?? 'Needs verification'} tone="moss" />
              <Badge icon="fact-check" label={card.verification_status} tone="muted" />
            </View>

            <View style={styles.priorityCard}>
              <View>
                <Text style={styles.priorityLabel}>Ecological Signal Priority</Text>
                <Text style={styles.priorityValue}>{signalPriorityDisplay(card)}</Text>
              </View>
              <Text style={styles.priorityTag}>{card.signal_label ?? 'Needs verification'}</Text>
            </View>

            <Text style={styles.explanation}>{card.plain_language_explanation}</Text>

            {card.similar_species_warning ? (
              <StatusPanel title="Similar species warning" message={card.similar_species_warning} />
            ) : null}

            {media.length > 0 ? <EvidenceMediaCard media={media} imageUrl={firstEvidenceImageUrl(media)} /> : null}

            {observation ? <SubmittedRecordCard observation={observation} /> : null}

            {observationError ? (
              <StatusPanel
                title="Submitted record unavailable"
                message={observationError}
                actionLabel="Retry"
                onActionPress={load}
                tone="error"
              />
            ) : null}

            {mediaError ? (
              <StatusPanel
                title="Evidence media unavailable"
                message={mediaError}
                actionLabel="Retry"
                onActionPress={load}
                tone="error"
              />
            ) : null}

            <SectionHeading title="Local context" />
            <InfoBlock title="Local status" text={card.local_status} />
            <InfoBlock title="Nearby records" text={card.known_nearby_records_summary} />
            <InfoBlock title="Habitat match" text={card.habitat_match_summary} />
            <InfoBlock title="Pathway context" text={card.pathway_summary} />
            <InfoBlock title="Sampling value" text={card.sampling_value_summary} />

            <StatusPanel title="Uncertainty notice" message={card.uncertainty_notice} />

            {assistantContext ? <AssistantContextPanel context={assistantContext} /> : null}

            {assistantError ? (
              <StatusPanel
                title="Assistant context unavailable"
                message={assistantError}
                actionLabel="Retry"
                onActionPress={load}
                tone="error"
              />
            ) : null}

            <SectionHeading title="Data sources" />
            <View style={styles.sourceStack}>
              {card.data_sources_used.map((source) => (
                <View key={source} style={styles.sourceRow}>
                  <MaterialIcons name="dataset" size={16} color={colors.moss} />
                  <Text style={styles.sourceText}>{source}</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/report',
                  params: { source: 'sighting_history', observationId: card.observation_id },
                })
              }
              style={({ pressed }) => [styles.followUpButton, pressed && styles.pressed]}>
              <MaterialIcons name="add-a-photo" size={18} color={colors.white} />
              <Text style={styles.followUpButtonText}>Create follow-up report</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </DetailFrame>
  );
}

function SubmittedRecordCard({ observation }: { observation: ObservationRead }) {
  return (
    <View style={styles.submissionCard}>
      <View style={styles.submissionHeader}>
        <View style={styles.submissionIcon}>
          <MaterialIcons name="assignment" size={20} color={colors.blue} />
        </View>
        <View style={styles.submissionCopy}>
          <Text style={styles.submissionEyebrow}>Submitted record</Text>
          <Text style={styles.submissionTitle}>{observationDateLabel(observation.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.submissionGrid}>
        <MiniRecordStat label="Privacy" value={observationPrivacyLabel(observation.privacy_level)} />
        <MiniRecordStat label="Precision" value={coordinateUncertaintyLabel(observation.coordinate_uncertainty_m)} />
        <MiniRecordStat label="Habitat clues" value={String(habitatAnswerCount(observation))} />
      </View>
      <Text style={styles.submissionNote}>
        Source: {observation.source.replaceAll('_', ' ')}
        {observation.region_code ? ` · Region: ${observation.region_code}` : ''}
      </Text>
    </View>
  );
}

function MiniRecordStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordStat}>
      <Text style={styles.recordStatLabel}>{label}</Text>
      <Text style={styles.recordStatValue}>{value}</Text>
    </View>
  );
}

function EvidenceMediaCard({ media, imageUrl }: { media: MediaRead[]; imageUrl: string | null }) {
  const summary = mediaEvidenceSummary(media);

  return (
    <View style={styles.mediaCard}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.mediaImage} contentFit="cover" /> : null}
      <View style={styles.mediaCopy}>
        <Text style={styles.mediaEyebrow}>Evidence media</Text>
        <Text style={styles.mediaTitle}>
          {summary.imageCount} image{summary.imageCount === 1 ? '' : 's'} attached
        </Text>
        <Text style={styles.mediaBody}>
          {summary.metadataRemovedCount > 0
            ? 'Metadata was removed before storage for privacy.'
            : `${summary.total} evidence file${summary.total === 1 ? '' : 's'} linked to this record.`}
        </Text>
      </View>
    </View>
  );
}

function AssistantContextPanel({ context }: { context: ObservationAssistantContext }) {
  const summary = summarizeObservationAssistantContext(context);
  const claims = firstAllowedClaims(context);

  return (
    <View style={styles.assistantCard}>
      <View style={styles.assistantHeader}>
        <View style={styles.assistantIcon}>
          <MaterialIcons name="psychology" size={20} color={colors.mossDark} />
        </View>
        <View style={styles.assistantCopy}>
          <Text style={styles.assistantEyebrow}>Grounded assistant context</Text>
          <Text style={styles.assistantTitle}>{summary.allowedClaimCount} allowed claims from platform data</Text>
        </View>
      </View>
      <View style={styles.assistantFlags}>
        <EvidencePill label="Identification" enabled={summary.hasIdentification} />
        <EvidencePill label="Environment" enabled={summary.hasEnvironmentalContext} />
        <EvidencePill label="Signal score" enabled={summary.hasSignalScore} />
      </View>
      {claims.map((claim) => (
        <Text key={claim} style={styles.allowedClaim}>
          {claim}
        </Text>
      ))}
      <Text style={styles.assistantNotice}>{context.required_uncertainty_notice}</Text>
      <Text style={styles.assistantSources}>
        {summary.dataSourceCount} data sources, verification status: {summary.verificationStatus}
      </Text>
    </View>
  );
}

function EvidencePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={[styles.evidencePill, !enabled && styles.evidencePillMuted]}>
      <MaterialIcons
        name={enabled ? 'check-circle' : 'radio-button-unchecked'}
        size={14}
        color={enabled ? colors.mossDark : colors.muted}
      />
      <Text style={[styles.evidencePillText, !enabled && styles.evidencePillTextMuted]}>{label}</Text>
    </View>
  );
}

function Badge({
  icon,
  label,
  tone,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tone: 'moss' | 'muted';
}) {
  const color = tone === 'moss' ? colors.mossDark : colors.muted;
  return (
    <View style={[styles.badge, tone === 'muted' && styles.mutedBadge]}>
      <MaterialIcons name={icon} size={14} color={color} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoText}>{text}</Text>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: colors.mossSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mutedBadge: {
    backgroundColor: colors.surfaceSoft,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  priorityCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priorityLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  priorityValue: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
  },
  priorityTag: {
    flex: 1,
    color: colors.mossDark,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  explanation: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 24,
  },
  mediaCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  mediaImage: {
    width: 86,
    height: 104,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  mediaCopy: {
    flex: 1,
    gap: 4,
  },
  mediaEyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mediaTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  mediaBody: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  submissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submissionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E1E9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submissionCopy: {
    flex: 1,
    gap: 2,
  },
  submissionEyebrow: {
    color: colors.blue,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  submissionTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  submissionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  recordStat: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 9,
    gap: 4,
  },
  recordStatLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  recordStatValue: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    lineHeight: 16,
  },
  submissionNote: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    textTransform: 'capitalize',
  },
  infoBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: 12,
    gap: 4,
  },
  infoTitle: {
    color: colors.mossDark,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  infoText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  sourceStack: {
    gap: 8,
  },
  assistantCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assistantIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantCopy: {
    flex: 1,
    gap: 2,
  },
  assistantEyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  assistantTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  assistantFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: colors.mossSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  evidencePillMuted: {
    backgroundColor: colors.surfaceSoft,
  },
  evidencePillText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  evidencePillTextMuted: {
    color: colors.muted,
  },
  allowedClaim: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  assistantNotice: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  assistantSources: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 12,
  },
  sourceText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  followUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.blue,
    paddingVertical: 14,
  },
  followUpButtonText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.86,
  },
});
