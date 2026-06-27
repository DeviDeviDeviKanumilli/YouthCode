import { describe, expect, it } from 'vitest';
import { bboxForRadius } from '../api/sampling';
import { samplingLabelCopy, summarizeSamplingGaps } from './sampling';
import type { SamplingGapFeatureCollection } from '../types/sampling';

describe('sampling helpers', () => {
  it('builds a bbox around local coordinates', () => {
    expect(bboxForRadius(40.714, -74.006, 10)).toMatch(
      /^-74\.\d+,40\.\d+,-73\.\d+,40\.\d+$/
    );
  });

  it('summarizes sampling labels and uncertainty copy', () => {
    const collection: SamplingGapFeatureCollection = {
      type: 'FeatureCollection',
      metadata: {},
      features: [
        {
          type: 'Feature',
          geometry: {},
          properties: {
            sampling_label: 'high_risk_under_sampled',
            explanation: 'Sparse observations near access suggest a priority survey gap.',
            uncertainty: 'Absence is not confirmed.',
          },
        },
        {
          type: 'Feature',
          geometry: {},
          properties: {
            sampling_label: 'high_risk_under_sampled',
          },
        },
        {
          type: 'Feature',
          geometry: {},
          properties: {
            sampling_label: 'well_sampled',
          },
        },
      ],
    };

    expect(summarizeSamplingGaps(collection)).toEqual({
      totalCells: 3,
      topLabel: 'high_risk_under_sampled',
      topExplanation: 'Sparse observations near access suggest a priority survey gap.',
      topUncertainty: 'Absence is not confirmed.',
      labels: [
        { label: 'high_risk_under_sampled', count: 2 },
        { label: 'well_sampled', count: 1 },
      ],
    });
    expect(samplingLabelCopy('likely_false_absence')).toBe('likely false absence');
  });
});
