import type { GoodPlaceDetail, GoodPlaceToCheck, GoodPlaceType, WatchItem, WatchItemDetail, WatchItemType } from '@/types/watch';

const COMMONS = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

const WATCH_TYPE_IMAGES: Record<WatchItemType, string> = {
  species_watch: `${COMMONS}Spotted%20lanternfly,%20wing%20detail%202017-06-08-18.04%20(35006929440).jpg?width=900`,
  seasonal_watch: `${COMMONS}Spotted%20lanternfly,%20wing%20detail%202017-06-08-18.04%20(35006929440).jpg?width=900`,
  habitat_watch: `${COMMONS}Japanese-knotweed-philadelphia.jpg?width=900`,
  tree_health: `${COMMONS}Paris%20750018%20Avenue%20Junot%20street%20trees.jpg?width=900`,
  aquatic_watch: `${COMMONS}River_Rocks_%28440298432%29.jpg?width=900`,
};

const WATCH_TITLE_IMAGES: Array<[RegExp, string]> = [
  [/lanternfly/i, `${COMMONS}Spotted%20lanternfly,%20wing%20detail%202017-06-08-18.04%20(35006929440).jpg?width=900`],
  [/knotweed/i, `${COMMONS}Japanese-knotweed-philadelphia.jpg?width=900`],
  [/emerald ash|ash borer/i, `${COMMONS}Paris%20750018%20Avenue%20Junot%20street%20trees.jpg?width=900`],
  [/loosestrife/i, `${COMMONS}Meadow_and_Woodland_Edge.jpg?width=900`],
];

const PLACE_IMAGES: Record<GoodPlaceType, string> = {
  creek_edges: `${COMMONS}River_Rocks_%28440298432%29.jpg?width=900`,
  trail_entrances: `${COMMONS}Trailhead.JPG?width=900`,
  park_boundaries: `${COMMONS}Boundary%20Fence%20at%20Charlecote%20Park%20-%20geograph.org.uk%20-%20801956.jpg?width=900`,
  street_trees: `${COMMONS}Paris%20750018%20Avenue%20Junot%20street%20trees.jpg?width=900`,
  wetland_edges: `${COMMONS}Meadow_and_Woodland_Edge.jpg?width=900`,
  garden_edges: `${COMMONS}Meadow_and_Woodland_Edge.jpg?width=900`,
};

export function watchItemImage(item: Pick<WatchItem, 'imageUrl' | 'title' | 'type'> | WatchItemDetail): string {
  if (isUsableImageUrl(item.imageUrl)) {
    return item.imageUrl as string;
  }

  const title = 'title' in item ? item.title : '';
  const titleMatch = WATCH_TITLE_IMAGES.find(([pattern]) => pattern.test(title));
  if (titleMatch) {
    return titleMatch[1];
  }

  if ('type' in item && item.type) {
    return WATCH_TYPE_IMAGES[item.type as WatchItemType] ?? WATCH_TYPE_IMAGES.species_watch;
  }

  return WATCH_TYPE_IMAGES.species_watch;
}

export function goodPlaceImage(place: Pick<GoodPlaceToCheck, 'imageUrl' | 'type'> | GoodPlaceDetail): string {
  if (isUsableImageUrl(place.imageUrl)) {
    return place.imageUrl as string;
  }
  return PLACE_IMAGES[place.type as GoodPlaceType] ?? PLACE_IMAGES.park_boundaries;
}

export function isUsableImageUrl(value?: string | null): boolean {
  return Boolean(value && /^https?:\/\//.test(value) && !value.includes('storage.example.com'));
}
