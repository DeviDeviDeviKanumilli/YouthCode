import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForecastGeoMap } from '@/components/layout/ForecastGeoMap';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { ForecastLayerSummary, GeoJSONFeatureCollection } from '@/types/forecast';

type MapBackdropProps = {
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  locationLabel: string;
  eyebrow?: string;
  locationHint?: string;
  demoLabel?: string;
  layerSummary?: ForecastLayerSummary | null;
  forecastCollection?: GeoJSONFeatureCollection | null;
  samplingCollection?: GeoJSONFeatureCollection | null;
  isLoadingLayers?: boolean;
  layerError?: string | null;
  onTargetPress?: () => void;
  onObservationPress?: (observationId: string) => void;
};

export function MapBackdrop({
  centerLat,
  centerLon,
  radiusKm,
  locationLabel,
  eyebrow,
  locationHint = 'Pan and zoom the forecast map',
  demoLabel,
  layerSummary,
  forecastCollection,
  samplingCollection,
  isLoadingLayers = false,
  layerError,
  onTargetPress,
  onObservationPress,
}: MapBackdropProps) {
  const insets = useSafeAreaInsets();
  const signalCount = layerSummary
    ? layerSummary.observations + layerSummary.knownRecords + layerSummary.possibleCorridors
    : 0;
  const samplingCount = layerSummary?.samplingGaps ?? 0;
  const featureCount = layerSummary?.totalFeatures ?? 0;

  return (
    <View style={styles.root}>
      <ForecastGeoMap
        centerLat={centerLat}
        centerLon={centerLon}
        radiusKm={radiusKm}
        forecastCollection={forecastCollection}
        samplingCollection={samplingCollection}
        onObservationPress={onObservationPress}
      />
      <View style={[styles.header, { top: insets.top + 12 }]}>
        <View>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {demoLabel ? <Text style={styles.demoEyebrow}>{demoLabel}</Text> : null}
          <Text style={styles.location}>{locationLabel}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color="#A6C0FA" />
            <Text style={styles.locationSub}>{locationHint}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh local area"
          onPress={onTargetPress}
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
          <MaterialIcons name="my-location" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.layerPanel}>
        <View style={styles.layerRow}>
          <LayerPill icon="timeline" label="Signals" value={isLoadingLayers ? '...' : String(signalCount)} />
          <LayerPill icon="grid-on" label="Gaps" value={isLoadingLayers ? '...' : String(samplingCount)} />
        </View>
        <Text style={styles.layerCaption}>
          {layerError
            ? 'Forecast layer unavailable'
            : layerSummary
              ? `${featureCount} geospatial features · tap observation pins to open cards`
              : 'Loading forecast layer'}
        </Text>
      </View>
    </View>
  );
}

function LayerPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.layerPill}>
      <MaterialIcons name={icon} size={14} color="#DCE9FF" />
      <Text style={styles.layerPillValue}>{value}</Text>
      <Text style={styles.layerPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  demoEyebrow: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  location: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationSub: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  layerPanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    gap: 8,
  },
  layerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  layerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(9,22,17,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  layerPillValue: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  layerPillLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  layerCaption: {
    alignSelf: 'flex-start',
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    backgroundColor: 'rgba(9,22,17,0.46)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
