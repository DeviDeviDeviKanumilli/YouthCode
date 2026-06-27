// GET /api/v1/friends — the caller's accepted friends (API_CONTRACT §friends).

import { NextResponse } from "next/server";
import type { FriendsResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { serializeUserSummary } from "@/lib/serializers";
import { getFriendIds } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const friendIds = await getFriendIds(userId);
    const rows = friendIds.length
      ? await prisma.profile.findMany({
          where: { id: { in: friendIds } },
          orderBy: { username: "asc" },
        })
      : [];
    const body: FriendsResponse = { friends: rows.map(serializeUserSummary) };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
