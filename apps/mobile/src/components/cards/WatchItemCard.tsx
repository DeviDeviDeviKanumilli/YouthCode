import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { WatchItem } from '@/types/watch';
import { confidenceCopy, priorityCopy } from '@/lib/watch';
import { watchItemImage } from '@/lib/images';

type WatchItemCardProps = {
  item: WatchItem;
  onOpenDetail: () => void;
  onPrimaryAction: () => void;
};

export function WatchItemCard({ item, onOpenDetail, onPrimaryAction }: WatchItemCardProps) {
  const confidenceColor =
    item.confidenceLabel === 'high'
      ? colors.mossDark
      : item.confidenceLabel === 'medium'
        ? colors.amber
        : colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpenDetail}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: watchItemImage(item) }}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel={item.imageAlt ?? item.title}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.labelPill, { backgroundColor: chipBackgroundForType(item.type) }]}>
            <MaterialIcons name={iconForType(item.type)} size={12} color={chipTextForType(item.type)} />
            <Text style={[styles.labelText, { color: chipTextForType(item.type) }]}>{item.label}</Text>
          </View>
          <View style={[styles.priorityPill, { backgroundColor: colors.surfaceSoft }]}>
            <Text style={styles.priorityText}>{priorityCopy(item.priority)}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>

        <View style={styles.chips}>
          {item.chips.slice(0, 4).map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.confidencePill, { borderColor: `${confidenceColor}33`, backgroundColor: `${confidenceColor}10` }]}>
            <MaterialIcons
              name={item.confidenceLabel === 'high' ? 'check-circle' : item.confidenceLabel === 'medium' ? 'info' : 'help-outline'}
              size={14}
              color={confidenceColor}
            />
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidenceCopy(item.confidenceLabel)}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryAction}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
            <Text style={styles.actionText}>{item.nextAction.label}</Text>
          </Pressable>
        </View>
      </View>

    </Pressable>
  );
}

function iconForType(type: WatchItem['type']) {
  switch (type) {
    case 'species_watch':
      return 'eco';
    case 'seasonal_watch':
      return 'timeline';
    case 'habitat_watch':
      return 'water';
    case 'tree_health':
      return 'park';
    case 'aquatic_watch':
    default:
      return 'waves';
  }
}

function chipBackgroundForType(type: WatchItem['type']) {
  switch (type) {
    case 'species_watch':
      return colors.mossSoft;
    case 'seasonal_watch':
      return colors.amberSoft;
    case 'habitat_watch':
      return colors.blueSoft;
    case 'tree_health':
      return '#F5EFE7';
    case 'aquatic_watch':
    default:
      return '#E4F1F4';
  }
}

function chipTextForType(type: WatchItem['type']) {
  switch (type) {
    case 'species_watch':
      return colors.mossDark;
    case 'seasonal_watch':
      return '#934934';
    case 'habitat_watch':
      return '#2E4A7D';
    case 'tree_health':
      return '#7A5B36';
    case 'aquatic_watch':
    default:
      return '#1E5F70';
  }
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 2,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  content: {
    flex: 1,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  labelText: {
    flexShrink: 1,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  priorityPill: {
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  priorityText: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    lineHeight: 24,
  },
  summary: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipText: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confidenceText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  actionButton: {
    backgroundColor: colors.moss,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionPressed: {
    opacity: 0.86,
  },
  actionText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  imageWrap: {
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDim,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
