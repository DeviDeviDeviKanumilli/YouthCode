import type { WatchMapOverlay } from '@/types/watch';

export type MapOverlayDisplay = {
  title: string;
  summary: string;
  hasGeometry: boolean;
  hasPoints: boolean;
};

export function mapOverlayDisplay(overlay: WatchMapOverlay | null | undefined): MapOverlayDisplay | null {
  if (!overlay) {
    return null;
  }

  return {
    title: overlayTitle(overlay.type),
    summary: overlaySummary(overlay),
    hasGeometry: Boolean(overlay.geometryGeoJson),
    hasPoints: Boolean(overlay.pointsGeoJson),
  };
}

function overlayTitle(type: WatchMapOverlay['type']) {
  switch (type) {
    case 'corridor':
      return 'Potential spread corridor';
    case 'area':
      return 'Context area';
    case 'point':
      return 'Point context';
    case 'boundary':
      return 'Boundary context';
    case 'records':
      return 'Nearby records';
    case 'habitat':
      return 'Habitat context';
  }
}

function overlaySummary(overlay: WatchMapOverlay) {
  const evidence = [
    overlay.geometryGeoJson ? 'area geometry' : null,
    overlay.pointsGeoJson ? 'record points' : null,
  ].filter(Boolean);
  if (evidence.length === 0) {
    return 'The backend provided map context for this item, but no drawable geometry was included.';
  }
  return `Backend map context includes ${evidence.join(' and ')}. Treat it as ecological context, not an exact prediction.`;
}
