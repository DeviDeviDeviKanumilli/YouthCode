// POST /api/v1/observations — the core capture→identify→score→PlantDex pipeline
// (API_CONTRACT §observations, AI_INTEGRATION.md). Verifies the caller, identifies the
// species via the swappable PlantIdentifier, matches/auto-creates the Library Plant,
// enforces the daily same-species quota, awards points, and upserts the PlantDexEntry —
// all transactionally so Profile.totalPoints and timesObserved never drift.

import { NextResponse } from "next/server";
import { Prisma, IdSource, IdStatus, Privacy } from "@sproutgo/db";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { createObservationSchema, parseBbox } from "@/lib/validation";
import {
  serializePlant,
  serializeObservation,
  serializeObservationMarker,
} from "@/lib/serializers";
import {
  MIN_AUTO_CREATE_CONFIDENCE,
  SCORING,
  firstDiscoveryPoints,
  duplicatePoints,
} from "@/config/scoring";
import { getPlantIdentifier, usesRealIdentifier } from "@/lib/identify";
import { assertObservationImage, createSignedImageUrl } from "@/lib/storage";
import { snapToGrid, shouldFuzz } from "@/lib/geo";
import type { ObservationResult, ObservationsMapResponse } from "@sproutgo/shared";

export const dynamic = "force-dynamic";

// Cap how many markers a single bbox query can return — a wide zoom over a dense area
// shouldn't ship thousands of pins. The client re-queries as the viewport changes.
const MAX_MARKERS = 500;

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = createObservationSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { imagePath, latitude, longitude, privacy } = parsed.data;

    // R3: the API is the real auth boundary. The storage path must live under the
    // caller's own prefix — never trust the client to scope its own uploads.
    if (!imagePath.startsWith(`${userId}/`)) {
      throw errors.forbidden("imagePath must be under your own storage prefix");
    }

    // --- Rate limiting + idempotency (P1 #4), all BEFORE the expensive identify call ---
    const nowMs = Date.now();

    // Idempotency: re-submitting the same imagePath within the window returns the prior
    // result instead of re-identifying / double-scoring, so client retries are safe.
    const dup = await prisma.observation.findFirst({
      where: {
        userId,
        imagePath,
        createdAt: { gte: new Date(nowMs - SCORING.idempotencyWindowSeconds * 1000) },
      },
      include: { plant: true },
      orderBy: { createdAt: "desc" },
    });
    if (dup) {
      const replay: ObservationResult = {
        observation: serializeObservation(dup),
        plant: dup.plant ? serializePlant(dup.plant) : null,
        confidence: dup.confidence,
        isFirstDiscovery: false,
        pointsAwarded: dup.pointsAwarded,
        idStatus: dup.idStatus,
        quotaReached: false,
      };
      return NextResponse.json(replay);
    }

    // Per-user rolling-window + daily total caps protect OpenAI spend and the DB.
    const [recentCount, todayCount] = await Promise.all([
      prisma.observation.count({
        where: { userId, createdAt: { gte: new Date(nowMs - SCORING.captureWindowSeconds * 1000) } },
      }),
      prisma.observation.count({ where: { userId, createdAt: { gte: startOfUtcDay() } } }),
    ]);
    if (recentCount >= SCORING.captureWindowMax) {
      throw errors.quota("You're capturing too fast — please wait a moment and try again.");
    }
    if (todayCount >= SCORING.dailyCaptureCap) {
      throw errors.quota("Daily capture limit reached. Come back tomorrow!");
    }

    // Before spending an identification, prove the image actually exists, is an image,
    // and is a sane size (P1 #3 — never mint observations from an arbitrary path). Real
    // ID runs against a short-lived signed URL; the offline stub (dev/test) skips this.
    let imageForId = imagePath;
    if (usesRealIdentifier()) {
      await assertObservationImage(imagePath);
      imageForId = await createSignedImageUrl(imagePath);
    }

    // Identify outside the transaction — it may hit the network (OpenAI) and we
    // don't want to hold a DB transaction open across that latency.
    const idResult = await getPlantIdentifier().identify(imageForId);

    const result = await prisma.$transaction(async (tx): Promise<ObservationResult> => {
      // Create the observation up front (PENDING) so every capture is recorded,
      // even uncertain ones or those over quota.
      const observation = await tx.observation.create({
        data: {
          userId,
          imagePath,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          // Privacy-by-default: never expose an exact capture location the user didn't
          // explicitly choose to share. They opt into PUBLIC/FRIENDS later when sharing.
          privacy: privacy ?? Privacy.PRIVATE,
          idStatus: IdStatus.PENDING,
        },
      });

      // --- Match / auto-create the Library Plant (AI_INTEGRATION.md branching) ---
      let plant = await tx.plant.findUnique({
        where: { scientificName: idResult.scientificName },
      });

      if (!plant && idResult.confidence >= MIN_AUTO_CREATE_CONFIDENCE && idResult.scientificName) {
        plant = await tx.plant.create({
          data: {
            scientificName: idResult.scientificName,
            commonName: idResult.commonName,
            family: idResult.family,
            source: IdSource.OPENAI,
            confidence: idResult.confidence,
          },
        });
      }

      // Confidence too low and no existing match → UNCERTAIN: record, award nothing,
      // no PlantDex unlock until the user confirms.
      if (!plant) {
        const updated = await tx.observation.update({
          where: { id: observation.id },
          data: { confidence: idResult.confidence, idStatus: IdStatus.UNCERTAIN },
        });
        return {
          observation: serializeObservation(updated),
          plant: null,
          confidence: idResult.confidence,
          isFirstDiscovery: false,
          pointsAwarded: 0,
          idStatus: IdStatus.UNCERTAIN,
        };
      }

      // --- Score + PlantDex upsert (POINTS_AND_RARITY.md) ---
      const existing = await tx.plantDexEntry.findUnique({
        where: { userId_plantId: { userId, plantId: plant.id } },
      });
      const isFirstDiscovery = !existing;

      // Daily same-species quota. The just-created observation still has a null
      // plantId, so it isn't counted here; priorToday = earlier matched captures today.
      const priorToday = await tx.observation.count({
        where: { userId, plantId: plant.id, createdAt: { gte: startOfUtcDay() } },
      });
      const quotaReached = priorToday >= SCORING.dailySameSpeciesCap;

      let pointsAwarded = 0;
      if (!quotaReached) {
        pointsAwarded = isFirstDiscovery
          ? firstDiscoveryPoints(plant.rarity)
          : duplicatePoints(plant.rarity, existing.timesObserved);
      }

      if (isFirstDiscovery) {
        await tx.plantDexEntry.create({
          data: { userId, plantId: plant.id, firstObservationId: observation.id },
        });
      } else {
        await tx.plantDexEntry.update({
          where: { userId_plantId: { userId, plantId: plant.id } },
          data: { timesObserved: { increment: 1 } },
        });
      }

      // Public-facing coordinates for the map: snap sensitive plants (rare/legendary/
      // invasive) to a coarse grid, pass others through exactly. Stored so the non-owner
      // bbox query filters on these and can't be probed for the exact point.
      let publicLatitude: number | null = null;
      let publicLongitude: number | null = null;
      if (latitude != null && longitude != null) {
        ({ latitude: publicLatitude, longitude: publicLongitude } = shouldFuzz(
          plant.rarity,
          plant.nativeStatus,
        )
          ? snapToGrid(latitude, longitude)
          : { latitude, longitude });
      }

      const updated = await tx.observation.update({
        where: { id: observation.id },
        data: {
          plantId: plant.id,
          confidence: idResult.confidence,
          idStatus: IdStatus.MATCHED,
          pointsAwarded,
          publicLatitude,
          publicLongitude,
        },
      });

      if (pointsAwarded > 0) {
        await tx.profile.update({
          where: { id: userId },
          data: { totalPoints: { increment: pointsAwarded } },
        });
      }

      return {
        observation: serializeObservation(updated),
        plant: serializePlant(plant),
        confidence: idResult.confidence,
        isFirstDiscovery,
        pointsAwarded,
        idStatus: IdStatus.MATCHED,
        quotaReached,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

// GET /api/v1/observations?bbox=minLng,minLat,maxLng,maxLat — discovery pins for the map.
// Privacy is enforced entirely in the Prisma `where` (R3: service-role Prisma bypasses
// RLS, so this is the only guard). The query is split so the owner sees their own pins by
// EXACT coordinate, while everyone else's pins are filtered on the PUBLIC (snapped-for-
// sensitive) columns — otherwise a tiny bbox could probe a rare plant's exact location.
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);

    const bbox = parseBbox(new URL(req.url).searchParams.get("bbox"));
    if (!bbox) {
      throw errors.validation("bbox=minLng,minLat,maxLng,maxLat is required and must be valid");
    }

    // Accepted friendships are materialized one row per pair (userAId < userBId), so the
    // viewer may sit in either column — collect friend ids from both sides.
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    const friendIds = friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId));

    // Own pins: filter on exact coords (the owner is allowed to see their own location).
    const ownPromise = prisma.observation.findMany({
      where: {
        userId,
        plantId: { not: null },
        latitude: { gte: bbox.minLat, lte: bbox.maxLat, not: null },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng, not: null },
      },
      include: { plant: true },
      orderBy: { createdAt: "desc" },
      take: MAX_MARKERS,
    });

    // Others' pins: filter on the PUBLIC columns so sensitive markers are only ever
    // queryable at their snapped grid cell, never their exact point.
    const othersPromise = prisma.observation.findMany({
      where: {
        userId: { not: userId },
        plantId: { not: null },
        publicLatitude: { gte: bbox.minLat, lte: bbox.maxLat, not: null },
        publicLongitude: { gte: bbox.minLng, lte: bbox.maxLng, not: null },
        OR: [
          { privacy: Privacy.PUBLIC },
          { privacy: Privacy.FRIENDS, userId: { in: friendIds } },
        ],
      },
      include: { plant: true },
      orderBy: { createdAt: "desc" },
      take: MAX_MARKERS,
    });

    const [own, others] = await Promise.all([ownPromise, othersPromise]);
    const observations = [...own, ...others]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, MAX_MARKERS);

    const body: ObservationsMapResponse = {
      markers: observations.map((o) => serializeObservationMarker(o, userId, friendIds)),
    };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
