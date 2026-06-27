import type { GeoJSONFeatureCollection } from './forecast';

export type SamplingGapFeatureCollection = GeoJSONFeatureCollection;

export type SamplingGapLabelSummary = {
  label: string;
  count: number;
};

export type SamplingGapSummary = {
  totalCells: number;
  topLabel: string | null;
  topExplanation: string | null;
  topUncertainty: string | null;
  labels: SamplingGapLabelSummary[];
};
