import { describe, expect, it } from 'vitest';
import { mapOverlayDisplay } from './mapOverlay';

describe('map overlay helpers', () => {
  it('summarizes corridor geometry without confirmed language', () => {
    expect(
      mapOverlayDisplay({
        type: 'corridor',
        geometryGeoJson: { type: 'LineString' },
        pointsGeoJson: { type: 'FeatureCollection' },
      })
    ).toEqual({
      title: 'Potential spread corridor',
      summary:
        'Backend map context includes area geometry and record points. Treat it as ecological context, not an exact prediction.',
      hasGeometry: true,
      hasPoints: true,
    });
  });

  it('returns null when no overlay is available', () => {
    expect(mapOverlayDisplay(null)).toBeNull();
  });
});
