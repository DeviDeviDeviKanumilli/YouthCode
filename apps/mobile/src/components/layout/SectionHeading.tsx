import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  accessory?: string;
};

export function SectionHeading({ title, subtitle, accessory }: SectionHeadingProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {accessory ? <Text style={styles.accessory}>{accessory}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: typeScale.headline,
    lineHeight: 28,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  accessory: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});

