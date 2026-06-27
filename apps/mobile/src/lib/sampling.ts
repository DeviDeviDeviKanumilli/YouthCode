import type { SamplingGapFeatureCollection, SamplingGapSummary } from '@/types/sampling';

export function summarizeSamplingGaps(collection: SamplingGapFeatureCollection): SamplingGapSummary {
  const counts = new Map<string, number>();
  let topLabel: string | null = null;
  let topExplanation: string | null = null;
  let topUncertainty: string | null = null;

  for (const feature of collection.features) {
    const label = stringProperty(feature.properties.sampling_label);
    if (!label) {
      continue;
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
    if (!topLabel) {
      topLabel = label;
      topExplanation = stringProperty(feature.properties.explanation);
      topUncertainty = stringProperty(feature.properties.uncertainty);
    }
  }

  const labels = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));

  return {
    totalCells: collection.features.length,
    topLabel,
    topExplanation,
    topUncertainty,
    labels,
  };
}

export function samplingLabelCopy(label: string | null) {
  if (!label) {
    return 'No sampling grid returned';
  }
  return label.replaceAll('_', ' ');
}

function stringProperty(value: unknown) {
  return typeof value === 'string' ? value : null;
}
