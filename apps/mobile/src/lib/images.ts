import type { GoodPlaceDetail, GoodPlaceToCheck, GoodPlaceType, WatchItem, WatchItemDetail, WatchItemType } from '@/types/watch';

const COMMONS = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

const WATCH_TYPE_IMAGES: Record<WatchItemType, string> = {
  species_watch: `${COMMONS}Spotted%20Lanternfly%20%2845539249434%29.jpg?width=900`,
  seasonal_watch: `${COMMONS}Spotted%20Lanternfly%20%2845539249434%29.jpg?width=900`,
  habitat_watch: `${COMMONS}Japanese%20knotweed%20%28Fallopia%20japonica%29.jpg?width=900`,
  tree_health: `${COMMONS}Ash%20tree%20bark.jpg?width=900`,
  aquatic_watch: `${COMMONS}Rocky%20creek%20in%20forest.jpg?width=900`,
};

const WATCH_TITLE_IMAGES: Array<[RegExp, string]> = [
  [/lanternfly/i, `${COMMONS}Spotted%20Lanternfly%20%2845539249434%29.jpg?width=900`],
  [/knotweed/i, `${COMMONS}Japanese%20knotweed%20%28Fallopia%20japonica%29.jpg?width=900`],
  [/emerald ash|ash borer/i, `${COMMONS}Emerald%20ash%20borer%20damage.jpg?width=900`],
  [/loosestrife/i, `${COMMONS}Lythrum%20salicaria%20%28Purple%20loosestrife%29.jpg?width=900`],
];

const PLACE_IMAGES: Record<GoodPlaceType, string> = {
  creek_edges: `${COMMONS}Rocky%20creek%20in%20forest.jpg?width=900`,
  trail_entrances: `${COMMONS}Forest%20trail%20entrance.jpg?width=900`,
  park_boundaries: `${COMMONS}Park%20boundary%20meadow.jpg?width=900`,
  street_trees: `${COMMONS}Street%20trees%20sidewalk.jpg?width=900`,
  wetland_edges: `${COMMONS}Wetland%20edge.jpg?width=900`,
  garden_edges: `${COMMONS}Community%20garden%20edge.jpg?width=900`,
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
