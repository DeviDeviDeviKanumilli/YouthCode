import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GoodPlaceToCheck } from '@/types/watch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { priorityCopy } from '@/lib/watch';
import { goodPlaceImage } from '@/lib/images';

type GoodPlaceCardProps = {
  place: GoodPlaceToCheck;
  onOpenDetail: () => void;
  onPrimaryAction: () => void;
};

export function GoodPlaceCard({ place, onOpenDetail, onPrimaryAction }: GoodPlaceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpenDetail}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image
        source={{ uri: goodPlaceImage(place) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={place.imageAlt ?? place.title}
      />
      <View style={styles.overlay} />
      <View style={styles.topBadge}>
        <MaterialIcons name={iconForPlace(place.type)} size={16} color={colors.ink} />
      </View>
      <View style={styles.bottomCopy}>
        <View style={styles.topLine}>
          <Text style={styles.title}>{place.title}</Text>
          <Text style={styles.priority}>{priorityCopy(place.priority)}</Text>
        </View>
        <Text style={styles.summary} numberOfLines={3}>
          {place.summary}
        </Text>
        <View style={styles.chips}>
          {place.chips.slice(0, 3).map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryAction}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
          <Text style={styles.actionText}>{place.nextAction.label}</Text>
        </Pressable>
      </View>
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
  card: {
    width: 242,
    height: 236,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDim,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  topBadge: {
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
  bottomCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    gap: 8,
  },
  topLine: {
    gap: 4,
  },
  title: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
  },
  priority: {
    color: 'rgba(255,255,255,0.76)',
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  summary: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    backgroundColor: 'rgba(252,250,244,0.16)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  chipText: {
    color: colors.white,
    fontFamily: fonts.label,
    fontSize: 9,
  },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionPressed: {
    opacity: 0.86,
  },
  actionText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
  },
});
