// GET /api/v1/profile/:id — public profile + social context (API_CONTRACT §profile, design
// §8.15). Works for any user including self (friendship === "self"). Returns the public
// projection (never isAdmin), collection stats + post/friend counts, the caller's friendship
// status, recent discoveries, and the target's posts the caller is allowed to see.

import { NextResponse } from "next/server";
import { Privacy } from "@sproutgo/db";
import type { PublicProfileResponse, SocialProfileStats } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { serializePublicProfile, serializePlantDexEntry } from "@/lib/serializers";
import { computeProfileStats } from "@/lib/stats";
import { computeFriendship, getFriendIds } from "@/lib/friends";
import { postInclude, serializePostsForViewer } from "@/lib/posts";

export const dynamic = "force-dynamic";

const RECENT_DISCOVERIES = 8;
const PROFILE_POSTS = 20;

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId: callerId } = await requireAuth(req);
    const targetId = params.id;

    const [profile, caller] = await Promise.all([
      prisma.profile.findUnique({ where: { id: targetId } }),
      prisma.profile.findUnique({ where: { id: callerId }, select: { isAdmin: true } }),
    ]);
    if (!profile) throw errors.notFound("Profile not found");

    const friendship = await computeFriendship(callerId, targetId);
    const isFriendOrSelf = friendship === "friends" || friendship === "self";

    // Posts the caller may see for this user: PUBLIC always; FRIENDS only if friends/self.
    const postsWhere =
      friendship === "self"
        ? { userId: targetId }
        : {
            userId: targetId,
            privacy: isFriendOrSelf
              ? { in: [Privacy.PUBLIC, Privacy.FRIENDS] }
              : Privacy.PUBLIC,
          };

    const [baseStats, postsCount, friendIds, discoveryRows, postRows] = await Promise.all([
      computeProfileStats(targetId, profile.totalPoints),
      prisma.post.count({ where: postsWhere }),
      getFriendIds(targetId),
      prisma.plantDexEntry.findMany({
        where: { userId: targetId },
        include: { plant: true },
        orderBy: { firstDiscoveredAt: "desc" },
        take: RECENT_DISCOVERIES,
      }),
      prisma.post.findMany({
        where: postsWhere,
        include: postInclude,
        orderBy: { createdAt: "desc" },
        take: PROFILE_POSTS,
      }),
    ]);

    const stats: SocialProfileStats = {
      ...baseStats,
      postsCount,
      friendsCount: friendIds.length,
    };

    const body: PublicProfileResponse = {
      profile: serializePublicProfile(profile),
      stats,
      friendship,
      recentDiscoveries: discoveryRows.map(serializePlantDexEntry),
      posts: await serializePostsForViewer(postRows, callerId, caller?.isAdmin ?? false),
    };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
