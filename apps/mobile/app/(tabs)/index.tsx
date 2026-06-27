import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenFrame } from '@/components/layout/ScreenFrame';
import { MapBackdrop } from '@/components/layout/MapBackdrop';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { messageForError } from '@/api/client';
import { getWatchScreen } from '@/api/watch';
import { useRegionAssistantContext } from '@/assistant/useRegionAssistantContext';
import type { GoodPlaceToCheck, WatchItem, WatchScreenResponse } from '@/types/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { FALLBACK_RADIUS_KM, useBackendCoordinates, useLocalArea } from '@/location/LocationProvider';
import { usePublicForecast, usePublicForecastBbox } from '@/forecast/usePublicForecast';
import { useNearbyRegion } from '@/regions/useNearbyRegion';
import { useSamplingGaps } from '@/sampling/useSamplingGaps';
import { useDemoScenarios } from '@/demo/useDemoScenarios';
import { selectedDemoScenario, summarizeDemoScenario } from '@/lib/demoScenarios';
import { goodPlaceImage, watchItemImage } from '@/lib/images';
import { summarizeRegionAssistantContext } from '@/lib/assistantContext';
import { summarizeNearbyRegion } from '@/lib/regions';
import { samplingLabelCopy } from '@/lib/sampling';
import type { DemoScenario } from '@/types/demo';
import type { RegionAssistantContext } from '@/types/assistant';
import type { NearbyRegionSummary } from '@/types/regions';
import type { SamplingGapSummary } from '@/types/sampling';
import { reportParamsForGoodPlace, reportParamsForWatchItem, watchItemActionHref, watchPlaceActionHref } from '@/lib/watch';
import { timeOfDayGreeting } from '@/lib/greeting';

export default function ExploreScreen() {
  const router = useRouter();
  const area = useLocalArea();
  const coords = useBackendCoordinates();
  const forecast = usePublicForecast(coords.lat, coords.lon, FALLBACK_RADIUS_KM);
  const nearbyRegion = useNearbyRegion(coords.lat, coords.lon, 10);
  const samplingGaps = useSamplingGaps(coords.lat, coords.lon, 10);
  const regionAssistant = useRegionAssistantContext(coords.lat, coords.lon, 10);
  const [activeDemoScenarioId, setActiveDemoScenarioId] = useState<string | null>(null);
  const demoScenarios = useDemoScenarios(activeDemoScenarioId);
  const activeDemoScenario = selectedDemoScenario(
    demoScenarios.scenarios,
    activeDemoScenarioId,
    demoScenarios.selectedScenario
  );
  const demoForecast = usePublicForecastBbox(activeDemoScenario?.map_query.bbox ?? null);
  const [response, setResponse] = useState<WatchScreenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getWatchScreen(coords.lat, coords.lon, FALLBACK_RADIUS_KM);
      setResponse(data);
      setError(null);
    } catch (err) {
      setError(messageForError(err, 'Unable to load local context.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lon]);

  const regionLabel = area.locationGranted ? area.label : response?.region.label ?? area.label;
  const mapSummary = activeDemoScenario ? demoForecast.summary : forecast.summary;
  const mapMarkers = activeDemoScenario ? demoForecast.markers : forecast.markers;
  const mapLoading = activeDemoScenario ? demoForecast.loading : forecast.loading;
  const mapError = activeDemoScenario ? demoForecast.error : forecast.error;
  const leadingPlace = response?.goodPlacesToCheck[0];
  const leadingWatch = response?.watchedNearYou[0];

  return (
    <ScreenFrame
      eyebrow={timeOfDayGreeting()}
      title="Explore"
      regionLabel={regionLabel}
      showTargetButton={false}
      topHeight={420}
      topContent={
        <MapBackdrop
          locationLabel={activeDemoScenario ? activeDemoScenario.title : regionLabel}
          demoLabel={activeDemoScenario ? 'Demo scenario map' : undefined}
          layerSummary={mapSummary}
          mapMarkers={mapMarkers}
          isLoadingLayers={mapLoading}
          layerError={mapError}
          onTargetPress={() =>
            void area.refresh().then(() =>
              Promise.all([
                load(),
                activeDemoScenario ? demoForecast.refresh() : forecast.refresh(),
                nearbyRegion.refresh(),
                samplingGaps.refresh(),
                regionAssistant.refresh(),
              ])
            )
          }
        />
      }>
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

        {forecast.error && !activeDemoScenario ? (
          <StatusPanel
            title="Forecast map is unavailable"
            message={forecast.error}
            actionLabel="Retry map"
            onActionPress={() => void forecast.refresh()}
            tone="error"
          />
        ) : null}

        {demoForecast.error && activeDemoScenario ? (
          <StatusPanel
            title="Demo map is unavailable"
            message={demoForecast.error}
            actionLabel="Retry demo map"
            onActionPress={() => void demoForecast.refresh()}
            tone="error"
          />
        ) : null}

        {demoScenarios.error ? (
          <StatusPanel
            title="Demo scenarios are unavailable"
            message={demoScenarios.error}
            actionLabel="Retry demos"
            onActionPress={() => void demoScenarios.refresh()}
            tone="error"
          />
        ) : null}

        {demoScenarios.selectedError && activeDemoScenarioId ? (
          <StatusPanel
            title="Selected demo is unavailable"
            message={demoScenarios.selectedError}
            actionLabel="Retry selected demo"
            onActionPress={() => void demoScenarios.refreshSelected()}
            tone="error"
          />
        ) : null}

        {demoScenarios.scenarios.length > 0 ? (
          <DemoScenarioDeck
            scenarios={demoScenarios.scenarios}
            activeScenarioId={activeDemoScenarioId}
            selectedScenario={demoScenarios.selectedScenario}
            selectedLoading={demoScenarios.selectedLoading}
            onSelect={(scenario) => setActiveDemoScenarioId(scenario.id)}
            onClear={() => setActiveDemoScenarioId(null)}
            onOpenSighting={(scenario) =>
              router.push({
                pathname: '/sightings/[id]',
                params: { id: scenario.seeded_observation_id },
              })
            }
          />
        ) : null}

        {nearbyRegion.error ? (
          <StatusPanel
            title="Local ecosystem context is unavailable"
            message={nearbyRegion.error}
            actionLabel="Retry context"
            onActionPress={() => void nearbyRegion.refresh()}
            tone="error"
          />
        ) : null}

        {samplingGaps.error ? (
          <StatusPanel
            title="Sampling context is unavailable"
            message={samplingGaps.error}
            actionLabel="Retry sampling"
            onActionPress={() => void samplingGaps.refresh()}
            tone="error"
          />
        ) : null}

        {regionAssistant.error ? (
          <StatusPanel
            title="Grounded area context is unavailable"
            message={regionAssistant.error}
            actionLabel="Retry context"
            onActionPress={() => void regionAssistant.refresh()}
            tone="error"
          />
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

        {nearbyRegion.region ? <RegionSummaryCard region={nearbyRegion.region} /> : null}

        {nearbyRegion.loading && !nearbyRegion.region ? (
          <View style={styles.regionCard}>
            <View style={styles.loadingLine} />
            <View style={[styles.loadingLine, { width: '58%' }]} />
          </View>
        ) : null}

        {samplingGaps.summary ? <SamplingGapCard summary={samplingGaps.summary} /> : null}

        {samplingGaps.loading && !samplingGaps.summary ? (
          <View style={styles.regionCard}>
            <View style={styles.loadingLine} />
            <View style={[styles.loadingLine, { width: '64%' }]} />
          </View>
        ) : null}

        {regionAssistant.context ? <RegionAssistantCard context={regionAssistant.context} /> : null}

        {regionAssistant.loading && !regionAssistant.context ? (
          <View style={styles.regionCard}>
            <View style={styles.loadingLine} />
            <View style={[styles.loadingLine, { width: '72%' }]} />
          </View>
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

function DemoScenarioDeck({
  scenarios,
  activeScenarioId,
  selectedScenario,
  selectedLoading,
  onSelect,
  onClear,
  onOpenSighting,
}: {
  scenarios: DemoScenario[];
  activeScenarioId: string | null;
  selectedScenario: DemoScenario | null;
  selectedLoading: boolean;
  onSelect: (scenario: DemoScenario) => void;
  onClear: () => void;
  onOpenSighting: (scenario: DemoScenario) => void;
}) {
  return (
    <View style={styles.demoSection}>
      <View style={styles.demoSectionHeader}>
        <View style={styles.regionCopy}>
          <Text style={styles.demoEyebrow}>Deterministic demo mode</Text>
          <Text style={styles.demoSectionTitle}>Seeded scenarios for judge walkthroughs</Text>
        </View>
        {activeScenarioId ? (
          <Pressable accessibilityRole="button" onPress={onClear} style={({ pressed }) => [styles.demoClear, pressed && styles.pressed]}>
            <Text style={styles.demoClearText}>Local map</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoRow}>
        {scenarios.map((scenario) => (
          <DemoScenarioCard
            key={scenario.id}
            scenario={scenario.id === selectedScenario?.id ? selectedScenario : scenario}
            selected={scenario.id === activeScenarioId}
            loading={scenario.id === activeScenarioId && selectedLoading}
            onSelect={() => onSelect(scenario)}
            onOpenSighting={() => onOpenSighting(scenario.id === selectedScenario?.id ? selectedScenario : scenario)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DemoScenarioCard({
  scenario,
  selected,
  loading,
  onSelect,
  onOpenSighting,
}: {
  scenario: DemoScenario;
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
  onOpenSighting: () => void;
}) {
  const summary = summarizeDemoScenario(scenario);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSelect}
      style={({ pressed }) => [styles.demoCard, selected && styles.demoCardSelected, pressed && styles.pressed]}>
      <View style={styles.demoCardTop}>
        <Text style={styles.demoPersona}>{scenario.persona}</Text>
        <Text style={styles.demoCheck}>
          {loading ? 'Loading detail' : `${summary.passingAssertionCount}/${summary.assertionCount} checks`}
        </Text>
      </View>
      <Text style={styles.demoTitle}>{scenario.title}</Text>
      <Text style={styles.demoStep}>{summary.firstStep}</Text>
      <View style={styles.demoPills}>
        <Text style={styles.demoPill}>{summary.possibleSpecies}</Text>
        <Text style={styles.demoPill}>{summary.signalLabel}</Text>
      </View>
      <View style={styles.demoFooter}>
        <Text style={styles.demoLayerText}>{summary.mapLayerCount} map layers</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSighting}
          style={({ pressed }) => [styles.demoOpenButton, pressed && styles.pressed]}>
          <Text style={styles.demoOpenText}>Open card</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function RegionAssistantCard({ context }: { context: RegionAssistantContext }) {
  const summary = summarizeRegionAssistantContext(context);
  return (
    <View style={styles.assistantCard}>
      <View style={styles.regionHeader}>
        <View style={styles.assistantIcon}>
          <MaterialIcons name="psychology" size={20} color={colors.mossDark} />
        </View>
        <View style={styles.regionCopy}>
          <Text style={styles.assistantEyebrow}>Grounded area context</Text>
          <Text style={styles.regionTitle}>
            {summary.observationCount} observations and {summary.samplingCellCount} sampling cells in context
          </Text>
        </View>
      </View>

      <View style={styles.regionStats}>
        <MiniStat value={String(summary.nearbySignalCount)} label="signals" />
        <MiniStat value={String(summary.samplingGapCount)} label="sampling gaps" />
        <MiniStat value={String(summary.highPriorityCount)} label="priority records" />
      </View>

      <Text style={styles.regionNote}>{context.data_sparsity_warning}</Text>
      <Text style={styles.regionUncertainty}>{context.required_uncertainty_notice}</Text>
      <Text style={styles.assistantSources}>{summary.dataSourceCount} grounded data sources</Text>
    </View>
  );
}

function SamplingGapCard({ summary }: { summary: SamplingGapSummary }) {
  const visibleLabels = summary.labels.slice(0, 3);
  return (
    <View style={styles.samplingCard}>
      <View style={styles.regionHeader}>
        <View style={styles.samplingIcon}>
          <MaterialIcons name="grid-on" size={20} color="#934934" />
        </View>
        <View style={styles.regionCopy}>
          <Text style={styles.samplingEyebrow}>Sampling gap layer</Text>
          <Text style={styles.regionTitle}>
            {summary.totalCells > 0
              ? `${summary.totalCells} nearby grid cells: ${samplingLabelCopy(summary.topLabel)}`
              : 'No nearby sampling grid cells returned'}
          </Text>
        </View>
      </View>

      {summary.topExplanation ? <Text style={styles.regionNote}>{summary.topExplanation}</Text> : null}
      {summary.topUncertainty ? <Text style={styles.regionUncertainty}>{summary.topUncertainty}</Text> : null}

      {visibleLabels.length > 0 ? (
        <View style={styles.speciesRow}>
          {visibleLabels.map((label) => (
            <Text key={label.label} style={styles.samplingPill}>
              {samplingLabelCopy(label.label)} · {label.count}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RegionSummaryCard({ region }: { region: NearbyRegionSummary }) {
  const stats = summarizeNearbyRegion(region);
  const watchedSpecies = region.watched_species.slice(0, 3);

  return (
    <View style={styles.regionCard}>
      <View style={styles.regionHeader}>
        <View style={styles.regionIcon}>
          <MaterialIcons name="public" size={20} color={colors.mossDark} />
        </View>
        <View style={styles.regionCopy}>
          <Text style={styles.regionEyebrow}>Local ecosystem</Text>
          <Text style={styles.regionTitle}>{region.region_summary}</Text>
        </View>
      </View>

      <View style={styles.regionStats}>
        <MiniStat value={String(stats.watchedSpeciesCount)} label="watched species" />
        <MiniStat value={String(stats.nearbySignalCount)} label="nearby signals" />
        <MiniStat value={String(stats.recentObservationCount)} label="recent points" />
      </View>

      {watchedSpecies.length > 0 ? (
        <View style={styles.speciesRow}>
          {watchedSpecies.map((species) => (
            <Text key={species} style={styles.speciesPill}>
              {species}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.regionNote}>{region.under_sampled_note}</Text>
      <Text style={styles.regionUncertainty}>{region.uncertainty_notice}</Text>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
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
  regionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
    gap: 14,
  },
  samplingCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
    gap: 14,
  },
  assistantCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
    gap: 14,
  },
  demoSection: {
    backgroundColor: '#101D17',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
  },
  demoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  demoEyebrow: {
    color: 'rgba(220,229,226,0.72)',
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  demoSectionTitle: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 22,
  },
  demoClear: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  demoClearText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  demoRow: {
    gap: 12,
    paddingRight: 8,
  },
  demoCard: {
    width: 286,
    minHeight: 230,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(252,250,244,0.08)',
    padding: 14,
    gap: 11,
  },
  demoCardSelected: {
    borderColor: '#A9CDAE',
    backgroundColor: 'rgba(177,207,164,0.18)',
  },
  demoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoPersona: {
    color: '#DCE5E2',
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  demoCheck: {
    color: '#BBD7BF',
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  demoTitle: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 23,
  },
  demoStep: {
    color: 'rgba(220,229,226,0.82)',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  demoPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  demoPill: {
    color: '#07110D',
    backgroundColor: '#E5EEDB',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  demoFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoLayerText: {
    color: 'rgba(220,229,226,0.76)',
    fontFamily: fonts.body,
    fontSize: 12,
  },
  demoOpenButton: {
    borderRadius: 999,
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  demoOpenText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  assistantIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantEyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  samplingIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  samplingEyebrow: {
    color: '#934934',
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  regionHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  regionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionCopy: {
    flex: 1,
    gap: 4,
  },
  regionEyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  regionTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 22,
  },
  regionStats: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 10,
    gap: 3,
  },
  miniStatValue: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  miniStatLabel: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.7,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  speciesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speciesPill: {
    color: colors.ink,
    backgroundColor: colors.mossSoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  samplingPill: {
    color: colors.ink,
    backgroundColor: colors.amberSoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  regionNote: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  regionUncertainty: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  assistantSources: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
