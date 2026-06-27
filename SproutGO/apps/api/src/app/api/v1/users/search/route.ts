// GET /api/v1/users/search?q= — find users by username (API_CONTRACT §friends). Public
// projection, excludes the caller. Case-insensitive prefix/substring match (no FTS for MVP).

import { NextResponse } from "next/server";
import type { UserSearchResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { userSearchSchema } from "@/lib/validation";
import { serializeUserSummary } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 20;

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = userSearchSchema.safeParse({
      q: new URL(req.url).searchParams.get("q") ?? "",
    });
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid query");
    }

    const rows = await prisma.profile.findMany({
      where: {
        id: { not: userId },
        username: { contains: parsed.data.q, mode: "insensitive" },
      },
      orderBy: { username: "asc" },
      take: MAX_RESULTS,
    });

    const body: UserSearchResponse = { users: rows.map(serializeUserSummary) };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
