// DELETE /api/v1/friends/:userId — unfriend (API_CONTRACT §friends). Removes the friendship
// row and any prior request rows between the two so they can re-friend later.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { orderedPair } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const other = params.userId;
    if (other === userId) throw errors.validation("You can't unfriend yourself");

    const pair = orderedPair(userId, other);
    const removed = await prisma.$transaction(async (tx) => {
      const del = await tx.friendship.deleteMany({ where: pair });
      // Clear request history both directions so a fresh request isn't blocked by the old row.
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: other },
            { senderId: other, receiverId: userId },
          ],
        },
      });
      return del.count;
    });

    if (removed === 0) throw errors.notFound("You are not friends with this user");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
