import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DetailFrame } from '@/components/layout/DetailFrame';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { getIntelligenceCard } from '@/api/observations';
import type { SightingIntelligenceCard } from '@/types/report';
import { intelligenceCardTitle, signalPriorityDisplay } from '@/lib/intelligenceCard';
import { watchItemImage } from '@/lib/images';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export default function SightingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<SightingIntelligenceCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getIntelligenceCard(id);
      setCard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this intelligence card.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const possibleName = intelligenceCardTitle(card);

  return (
    <DetailFrame
      title={possibleName}
      subtitle="Sighting Intelligence Card"
      imageUrl={watchItemImage({ title: possibleName, type: 'species_watch', imageUrl: null })}
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

            <SectionHeading title="Local context" />
            <InfoBlock title="Local status" text={card.local_status} />
            <InfoBlock title="Nearby records" text={card.known_nearby_records_summary} />
            <InfoBlock title="Habitat match" text={card.habitat_match_summary} />
            <InfoBlock title="Pathway context" text={card.pathway_summary} />
            <InfoBlock title="Sampling value" text={card.sampling_value_summary} />

            <StatusPanel title="Uncertainty notice" message={card.uncertainty_notice} />

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
