// GET /api/v1/library/:plantId → the Plant Detail screen payload (API_CONTRACT §library,
// design §8.11): the Library Plant plus the community sightings the caller is allowed to see.
// Privacy is enforced entirely in the Prisma `where` (R3: service-role Prisma bypasses RLS).
// Coordinates are emitted through serializeObservationMarker so rare/sensitive plants stay
// server-fuzzed for non-owners — identical to the map bbox query.

import { NextResponse } from "next/server";
import { Privacy } from "@sproutgo/db";
import type { PlantDetailResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { serializePlant, serializeObservationMarker } from "@/lib/serializers";
import { getFriendIds } from "@/lib/friends";

export const dynamic = "force-dynamic";

// Bound the lists so a heavily-observed species doesn't ship an unbounded payload.
const MAX_SIGHTINGS = 200;
const MAX_COMMUNITY_PHOTOS = 24;

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const plantId = params.id;

    const plant = await prisma.plant.findUnique({ where: { id: plantId } });
    if (!plant) {
      throw errors.notFound("Plant not found");
    }

    const friendIds = await getFriendIds(userId);

    // Everything the caller may see for this plant: their own, anyone's PUBLIC, and a
    // friend's FRIENDS-scoped observations.
    const visibleToCaller = {
      OR: [
        { userId },
        { privacy: Privacy.PUBLIC },
        { privacy: Privacy.FRIENDS, userId: { in: friendIds } },
      ],
    };

    const [sightingRows, photoRows] = await Promise.all([
      // Map sightings: visible observations that carry coordinates. Two independent OR
      // conditions (visibility + has-coordinates) are combined with AND so neither clobbers
      // the other.
      prisma.observation.findMany({
        where: {
          plantId,
          AND: [
            visibleToCaller,
            { OR: [{ latitude: { not: null } }, { publicLatitude: { not: null } }] },
          ],
        },
        include: { plant: true },
        orderBy: { createdAt: "desc" },
        take: MAX_SIGHTINGS,
      }),
      // Community photos: others' PUBLIC observations of this plant, most recent first.
      prisma.observation.findMany({
        where: { plantId, userId: { not: userId }, privacy: Privacy.PUBLIC },
        include: { plant: true },
        orderBy: { createdAt: "desc" },
        take: MAX_COMMUNITY_PHOTOS,
      }),
    ]);

    const body: PlantDetailResponse = {
      plant: serializePlant(plant),
      communityPhotos: photoRows.map((o) => serializeObservationMarker(o, userId, friendIds)),
      sightings: sightingRows.map((o) => serializeObservationMarker(o, userId, friendIds)),
    };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
