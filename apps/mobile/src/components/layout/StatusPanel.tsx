import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type StatusPanelProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  tone?: 'neutral' | 'error';
};

export function StatusPanel({
  title,
  message,
  actionLabel,
  onActionPress,
  tone = 'neutral',
}: StatusPanelProps) {
  const accent = tone === 'error' ? colors.red : colors.moss;

  return (
    <View style={[styles.wrap, { borderColor: `${accent}22`, backgroundColor: colors.surface }]}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={tone === 'error' ? 'error-outline' : 'eco'} size={22} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => [styles.button, { backgroundColor: accent }, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    marginTop: 2,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  message: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.86,
  },
});

