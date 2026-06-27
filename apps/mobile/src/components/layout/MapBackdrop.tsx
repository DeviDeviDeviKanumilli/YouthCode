import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type MapBackdropProps = {
  locationLabel: string;
  demoLabel?: string;
  onTargetPress?: () => void;
};

export function MapBackdrop({ locationLabel, demoLabel, onTargetPress }: MapBackdropProps) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.dark, colors.darkAlt, '#102017']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.grid} />
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
        <View style={[styles.markerRing, { top: '18%', left: '12%' }]} />
        <View style={[styles.markerDot, { top: '22%', left: '16%', backgroundColor: colors.moss }]} />
        <View style={[styles.markerRing, { top: '42%', left: '54%', borderColor: 'rgba(212,137,67,0.34)' }]} />
        <View style={[styles.markerDot, { top: '46%', left: '58%', backgroundColor: colors.amber }]} />
        <View style={[styles.markerRing, { top: '60%', left: '28%', borderColor: 'rgba(91,126,181,0.32)' }]} />
        <View style={[styles.markerDot, { top: '64%', left: '32%', backgroundColor: colors.blue }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.12,
    backgroundColor: 'transparent',
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
});
