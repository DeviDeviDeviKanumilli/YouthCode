import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { ForecastLayerSummary } from '@/types/forecast';
import type { ForecastMapMarker } from '@/lib/forecastMap';

type MapBackdropProps = {
  locationLabel: string;
  demoLabel?: string;
  layerSummary?: ForecastLayerSummary | null;
  mapMarkers?: ForecastMapMarker[];
  isLoadingLayers?: boolean;
  layerError?: string | null;
  onTargetPress?: () => void;
};

export function MapBackdrop({
  locationLabel,
  demoLabel,
  layerSummary,
  mapMarkers = [],
  isLoadingLayers = false,
  layerError,
  onTargetPress,
}: MapBackdropProps) {
  const signalCount = layerSummary
    ? layerSummary.observations + layerSummary.knownRecords + layerSummary.possibleCorridors
    : 0;
  const samplingCount = layerSummary?.samplingGaps ?? 0;
  const hasBackendMarkers = mapMarkers.length > 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.dark, colors.darkAlt, '#102017']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.mapLines}>
        <View style={[styles.road, styles.roadOne]} />
        <View style={[styles.road, styles.roadTwo]} />
        <View style={[styles.road, styles.roadThree]} />
        <View style={[styles.creek, styles.creekOne]} />
      </View>
      <View style={styles.dimTop} />
      <View style={styles.header}>
        <View>
          {demoLabel ? <Text style={styles.eyebrow}>{demoLabel}</Text> : null}
          <Text style={styles.location}>{locationLabel}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color="#A6C0FA" />
            <Text style={styles.locationSub}>Your location</Text>
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
      <View style={styles.markers}>
        <View style={styles.userPulse} />
        <View style={styles.userRing} />
        <View style={styles.userDot} />
        {hasBackendMarkers
          ? mapMarkers.map((marker) => <ForecastMarker key={marker.id} marker={marker} />)
          : (
            <>
              <View style={[styles.markerRing, { top: '18%', left: '12%' }]} />
              <View style={[styles.markerDot, { top: '22%', left: '16%', backgroundColor: colors.moss }]} />
              <View style={[styles.markerRing, { top: '42%', left: '54%', borderColor: 'rgba(212,137,67,0.34)' }]} />
              <View style={[styles.markerDot, { top: '46%', left: '58%', backgroundColor: colors.amber }]} />
              <View style={[styles.markerRing, { top: '60%', left: '28%', borderColor: 'rgba(91,126,181,0.32)' }]} />
              <View style={[styles.markerDot, { top: '64%', left: '32%', backgroundColor: colors.blue }]} />
            </>
          )}
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
              ? hasBackendMarkers
                ? `${mapMarkers.length} mapped signals from backend forecast`
                : `${layerSummary.totalFeatures} public map features`
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

function markerColor(tone: ForecastMapMarker['tone']) {
  switch (tone) {
    case 'observation':
      return colors.moss;
    case 'known_record':
      return colors.blue;
    case 'corridor':
      return colors.amber;
    case 'sampling_gap':
      return '#8A7B67';
    default:
      return '#6E8F9A';
  }
}

function ForecastMarker({ marker }: { marker: ForecastMapMarker }) {
  const color = markerColor(marker.tone);
  return (
    <>
      <View
        style={[
          styles.markerRing,
          {
            top: `${marker.yPercent - 4}%`,
            left: `${marker.xPercent - 6}%`,
            borderColor: `${color}55`,
          },
        ]}
      />
      <View
        style={[
          styles.markerDot,
          styles.positionedMarkerDot,
          {
            top: `${marker.yPercent}%`,
            left: `${marker.xPercent}%`,
            backgroundColor: color,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  mapLines: {
    ...StyleSheet.absoluteFill,
    opacity: 0.3,
  },
  road: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(244,241,232,0.18)',
  },
  roadOne: {
    width: 380,
    left: -60,
    top: 150,
    transform: [{ rotate: '-28deg' }],
  },
  roadTwo: {
    width: 420,
    right: -80,
    top: 255,
    transform: [{ rotate: '18deg' }],
  },
  roadThree: {
    width: 260,
    left: 70,
    bottom: 72,
    transform: [{ rotate: '-8deg' }],
  },
  creek: {
    position: 'absolute',
    width: 360,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(110,148,214,0.2)',
  },
  creekOne: {
    left: -20,
    top: 214,
    transform: [{ rotate: '-16deg' }],
  },
  dimTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,17,13,0.2)',
  },
  header: {
    position: 'absolute',
    top: 18,
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
  markers: {
    ...StyleSheet.absoluteFill,
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
  userPulse: {
    position: 'absolute',
    top: '38%',
    left: '48%',
    width: 84,
    height: 84,
    marginLeft: -42,
    marginTop: -42,
    borderRadius: 42,
    backgroundColor: 'rgba(91,126,181,0.18)',
  },
  userRing: {
    position: 'absolute',
    top: '38%',
    left: '48%',
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(166,192,250,0.4)',
    backgroundColor: 'rgba(91,126,181,0.16)',
  },
  userDot: {
    position: 'absolute',
    top: '38%',
    left: '48%',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.blue,
  },
  markerRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(91,126,181,0.34)',
    backgroundColor: 'rgba(91,126,181,0.08)',
  },
  markerDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  positionedMarkerDot: {
    marginLeft: -8,
    marginTop: -8,
  },
});
