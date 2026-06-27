import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type DetailFrameProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  rightAccessory?: ReactNode;
  onBack: () => void;
  children: ReactNode;
};

export function DetailFrame({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  rightAccessory,
  onBack,
  children,
}: DetailFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={imageAlt ?? title}
          />
        ) : (
          <LinearGradient
            colors={[colors.dark, colors.darkAlt, '#101915']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.66)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroInner, { paddingTop: insets.top + 10 }]}>
          <View style={styles.heroBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <MaterialIcons name="arrow-back-ios" size={18} color={colors.white} />
            </Pressable>
            {rightAccessory ? <View>{rightAccessory}</View> : <View style={styles.iconPlaceholder} />}
          </View>
          <View style={styles.heroText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
      <View style={styles.sheet}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.content}>{children}</View>
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
    height: 280,
    overflow: 'hidden',
  },
  heroInner: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 42,
    height: 42,
  },
  pressed: {
    opacity: 0.8,
  },
  heroText: {
    gap: 6,
    paddingBottom: 12,
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 31,
    lineHeight: 36,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -26,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: -16 },
    shadowRadius: 24,
    elevation: 12,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.outline,
  },
  content: {
    flex: 1,
  },
});
