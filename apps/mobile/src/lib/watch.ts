import type { Href } from 'expo-router';
import type { ConfidenceLabel, GoodPlaceToCheck, WatchAction, WatchItem } from '../types/watch';

export function formatUpdatedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Updated recently';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function confidenceCopy(label: ConfidenceLabel) {
  switch (label) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
    default:
      return 'Low confidence';
  }
}

export function priorityCopy(priority: number) {
  if (priority >= 76) {
    return 'Priority ecological signal';
  }
  if (priority >= 51) {
    return 'High-value verification candidate';
  }
  if (priority >= 26) {
    return 'Moderate signal';
  }
  return 'Low signal';
}

export function watchItemActionHref(item: Pick<WatchItem, 'id'>): Href {
  return {
    pathname: '/watch/item/[id]',
    params: { id: item.id },
  };
}

export function watchPlaceActionHref(place: Pick<GoodPlaceToCheck, 'id'>): Href {
  return {
    pathname: '/watch/place/[id]',
    params: { id: place.id },
  };
}

export function reportParamsForWatchItem(item: Pick<WatchItem, 'id' | 'speciesId' | 'title'>) {
  const params: Record<string, string> = {
    source: 'watch_item',
    watchItemId: item.id,
    suggestedSpeciesName: item.title,
  };
  if (item.speciesId) {
    params.suggestedSpeciesId = item.speciesId;
  }
  return params;
}

export function reportParamsForGoodPlace(place: Pick<GoodPlaceToCheck, 'id'> & { type: string }) {
  const params: Record<string, string> = {
    source: 'good_place',
    placeId: place.id,
    placeType: place.type,
  };
  if (place.type === 'creek_edges') {
    params.habitatHint = 'near_water';
  }
  return params;
}

export function actionCopy(action: WatchAction) {
  switch (action.type) {
    case 'start_report_with_species':
      return 'Report this species';
    case 'start_report_with_place_context':
      return 'Report near here';
    case 'view_nearby_signals':
      return 'View nearby signals';
    case 'open_watch_detail':
      return 'Open details';
    case 'open_guide':
      return 'Open guide';
    default:
      return action.label;
  }
}
