import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';
import { MaterialIcons } from '@expo/vector-icons';

type ScreenFrameProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  regionLabel?: string;
  showTargetButton?: boolean;
  onTargetPress?: () => void;
  topContent?: ReactNode;
  children: ReactNode;
  sheetBackground?: string;
  topHeight?: number;
};

export function ScreenFrame({
  title,
  subtitle,
  eyebrow,
  regionLabel,
  showTargetButton,
  onTargetPress,
  topContent,
  children,
  sheetBackground = colors.background,
  topHeight = 320,
}: ScreenFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.hero, { height: topHeight }]}>
        <LinearGradient
          colors={[colors.dark, colors.darkAlt, '#111A15']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTexture} />
        <View style={[styles.heroInner, { paddingTop: insets.top + 20 }]}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {regionLabel ? <Text style={styles.region}>{regionLabel}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {showTargetButton ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh local area"
                onPress={onTargetPress}
                style={({ pressed }) => [styles.targetButton, pressed && styles.pressed]}>
                <MaterialIcons name="my-location" size={22} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
          {topContent ? <View style={styles.heroVisual}>{topContent}</View> : null}
        </View>
      </View>
      <View style={[styles.sheet, { backgroundColor: sheetBackground }]}>
        <View style={styles.sheetHandleWrap}>
          <View style={styles.sheetHandle} />
        </View>
        <View style={styles.sheetContent}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  hero: {
    overflow: 'hidden',
  },
  heroTexture: {
    ...StyleSheet.absoluteFill,
    opacity: 0.18,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroInner: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: typeScale.hero,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  region: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
  },
  subtitle: {
    color: 'rgba(220,229,226,0.92)',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
  targetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  heroVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: -16 },
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.outline,
  },
  sheetContent: {
    flex: 1,
  },
});
