import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { firstAllowedClaims, summarizeObservationAssistantContext } from '@/lib/assistantContext';
import type { ObservationAssistantContext } from '@/types/assistant';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type ObservationAssistantContextPanelProps = {
  context: ObservationAssistantContext;
};

export function ObservationAssistantContextPanel({ context }: ObservationAssistantContextPanelProps) {
  const summary = summarizeObservationAssistantContext(context);
  const claims = firstAllowedClaims(context);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialIcons name="psychology" size={20} color={colors.mossDark} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Grounded assistant context</Text>
          <Text style={styles.title}>{summary.allowedClaimCount} allowed claims from platform data</Text>
        </View>
      </View>
      <View style={styles.flags}>
        <EvidencePill label="Identification" enabled={summary.hasIdentification} />
        <EvidencePill label="Environment" enabled={summary.hasEnvironmentalContext} />
        <EvidencePill label="Signal score" enabled={summary.hasSignalScore} />
      </View>
      {claims.map((claim) => (
        <Text key={claim} style={styles.claim}>
          {claim}
        </Text>
      ))}
      <Text style={styles.notice}>{context.required_uncertainty_notice}</Text>
      <Text style={styles.sources}>
        {summary.dataSourceCount} data sources, verification status: {summary.verificationStatus}
      </Text>
    </View>
  );
}

function EvidencePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={[styles.evidencePill, !enabled && styles.evidencePillMuted]}>
      <MaterialIcons
        name={enabled ? 'check-circle' : 'radio-button-unchecked'}
        size={14}
        color={enabled ? colors.mossDark : colors.muted}
      />
      <Text style={[styles.evidencePillText, !enabled && styles.evidencePillTextMuted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: colors.mossSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  evidencePillMuted: {
    backgroundColor: colors.surfaceSoft,
  },
  evidencePillText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  evidencePillTextMuted: {
    color: colors.muted,
  },
  claim: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  sources: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
