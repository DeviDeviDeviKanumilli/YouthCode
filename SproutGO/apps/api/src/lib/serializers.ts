// Serializers: Prisma rows → API wire shapes (dates as ISO strings, etc.).

import type {
  Profile as ProfileRow,
  Plant as PlantRow,
  Observation as ObservationRow,
  PlantDexEntry as PlantDexEntryRow,
  Post as PostRow,
  Comment as CommentRow,
} from "@sproutgo/db";
import type {
  Profile,
  ProfileStats,
  ProfileWithStats,
  Plant,
  Observation,
  PlantDexEntry,
  ObservationMarker,
  UserSummary,
  Post,
  Comment,
  ForumCategory,
} from "@sproutgo/shared";
import { snapToGrid, shouldFuzz } from "./geo";

export function serializeProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    totalPoints: row.totalPoints,
    isAdmin: row.isAdmin,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeProfileWithStats(
  row: ProfileRow,
  stats: ProfileStats,
): ProfileWithStats {
  return { ...serializeProfile(row), stats };
}

// Public projection — hides admin flag from non-self views.
export function serializePublicProfile(row: ProfileRow): Omit<Profile, "isAdmin"> {
  const { isAdmin: _omit, ...rest } = serializeProfile(row);
  return rest;
}

export function serializePlant(row: PlantRow): Plant {
  return {
    id: row.id,
    scientificName: row.scientificName,
    commonName: row.commonName,
    family: row.family,
    genus: row.genus,
    type: row.type,
    description: row.description,
    habitat: row.habitat,
    nativeStatus: row.nativeStatus,
    rarity: row.rarity,
    imageUrl: row.imageUrl,
    imageLicense: row.imageLicense,
    imageAttribution: row.imageAttribution,
    imageSourceUrl: row.imageSourceUrl,
    source: row.source,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    userId: row.userId,
    plantId: row.plantId,
    imagePath: row.imagePath,
    latitude: row.latitude,
    longitude: row.longitude,
    confidence: row.confidence,
    idStatus: row.idStatus,
    privacy: row.privacy,
    pointsAwarded: row.pointsAwarded,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializePlantDexEntry(
  row: PlantDexEntryRow & { plant: PlantRow },
): PlantDexEntry {
  return {
    id: row.id,
    plantId: row.plantId,
    firstDiscoveredAt: row.firstDiscoveredAt.toISOString(),
    timesObserved: row.timesObserved,
    plant: serializePlant(row.plant),
  };
}

// --- M4 social serializers --------------------------------------------------

export function serializeUserSummary(row: ProfileRow): UserSummary {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
  };
}

// A feed/forum post for the wire. The image lives in the private observations bucket, so the
// route mints a short-lived signed URL and passes it in (null when no image). Viewer-relative
// flags (likedByMe / isOwn / canDelete) are computed by the route, which knows the caller.
export function serializePost(
  row: PostRow & { user: ProfileRow; plant: PlantRow | null },
  opts: { signedImageUrl: string | null; likedByMe: boolean; viewerId: string; viewerIsAdmin: boolean },
): Post {
  const isOwn = row.userId === opts.viewerId;
  return {
    id: row.id,
    author: serializeUserSummary(row.user),
    plantId: row.plantId,
    imageUrl: opts.signedImageUrl,
    title: row.title,
    caption: row.caption,
    category: (row.category as ForumCategory | null) ?? null,
    generalLocation: row.generalLocation,
    privacy: row.privacy,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    likedByMe: opts.likedByMe,
    isOwn,
    canDelete: isOwn || opts.viewerIsAdmin,
    plant: row.plant
      ? {
          id: row.plant.id,
          commonName: row.plant.commonName,
          scientificName: row.plant.scientificName,
          rarity: row.plant.rarity,
          imageUrl: row.plant.imageUrl,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeComment(row: CommentRow & { user: ProfileRow }): Comment {
  return {
    id: row.id,
    postId: row.postId,
    author: serializeUserSummary(row.user),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

// A map pin for GET /observations?bbox=. The viewer's own observations carry exact
// coordinates; for everyone else we emit the PUBLIC coordinates persisted at write time
// (snapped to a grid for rare/sensitive plants, exact otherwise). Because the GET query
// already filters non-owner rows on those public columns, a tiny bbox can never recover a
// rare plant's exact point (R3: fuzzing is server-side). Rows are pre-filtered to have a
// linked plant and the relevant non-null coordinates.
export function serializeObservationMarker(
  row: ObservationRow & { plant: PlantRow | null },
  viewerId: string,
  friendIds: readonly string[] = [],
): ObservationMarker {
  const isOwn = row.userId === viewerId;
  const source: ObservationMarker["source"] = isOwn
    ? "own"
    : friendIds.includes(row.userId)
      ? "friend"
      : "public";
  const rarity = row.plant?.rarity ?? null;
  const sensitive = shouldFuzz(rarity, row.plant?.nativeStatus ?? null);

  let latitude: number;
  let longitude: number;
  let fuzzed = false;

  if (isOwn) {
    // Owner always sees their own exact location.
    latitude = row.latitude as number;
    longitude = row.longitude as number;
  } else if (row.publicLatitude != null && row.publicLongitude != null) {
    // Non-owner: start from the persisted public coordinate, but re-snap at read time
    // when the plant is currently sensitive. This is defense-in-depth against a plant
    // that was auto-created COMMON (exact public coords stored) and LATER reclassified
    // rare/invasive — snapping an already-snapped point is idempotent, so the serializer
    // stays authoritative for the CURRENT rarity. (Reclassification should also backfill
    // the stored columns so the bbox query can't be probed — see schema note.)
    latitude = row.publicLatitude;
    longitude = row.publicLongitude;
    if (sensitive) {
      ({ latitude, longitude } = snapToGrid(latitude, longitude));
    }
    fuzzed = sensitive;
  } else {
    // Legacy rows written before publicLatitude existed — snap on the fly as a fallback.
    latitude = row.latitude as number;
    longitude = row.longitude as number;
    if (sensitive) {
      ({ latitude, longitude } = snapToGrid(latitude, longitude));
      fuzzed = true;
    }
  }

  return {
    id: row.id,
    plantId: row.plantId,
    latitude,
    longitude,
    rarity,
    isOwn,
    source,
    fuzzed,
    plant: row.plant
      ? {
          id: row.plant.id,
          commonName: row.plant.commonName,
          scientificName: row.plant.scientificName,
          rarity: row.plant.rarity,
          imageUrl: row.plant.imageUrl,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}
