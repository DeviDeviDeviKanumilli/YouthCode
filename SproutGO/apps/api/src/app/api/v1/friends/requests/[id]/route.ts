// PATCH /api/v1/friends/requests/:id — accept or reject a pending request (API_CONTRACT
// §friends). Only the receiver may act. Accepting flips the status AND materializes the
// Friendship (ordered pair) in one transaction so the two never diverge.

import { NextResponse } from "next/server";
import { Prisma, FriendStatus } from "@sproutgo/db";
import type { FriendRequestView } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { friendRequestActionSchema } from "@/lib/validation";
import { serializeUserSummary } from "@/lib/serializers";
import { orderedPair } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = friendRequestActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const request = await prisma.friendRequest.findUnique({
      where: { id: params.id },
      include: { sender: true },
    });
    if (!request || request.receiverId !== userId) {
      // Don't reveal requests addressed to someone else.
      throw errors.notFound("Request not found");
    }
    if (request.status !== FriendStatus.PENDING) {
      throw errors.conflict("This request has already been answered");
    }

    const accept = parsed.data.action === "accept";
    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.friendRequest.update({
        where: { id: request.id },
        data: {
          status: accept ? FriendStatus.ACCEPTED : FriendStatus.REJECTED,
          respondedAt: new Date(),
        },
        include: { sender: true },
      });
      if (accept) {
        const pair = orderedPair(request.senderId, request.receiverId);
        try {
          await tx.friendship.create({ data: pair });
        } catch (e) {
          // Already friends (e.g. double-accept race) — ignore the unique violation.
          if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
            throw e;
          }
        }
      }
      return r;
    });

    const view: FriendRequestView = {
      id: updated.id,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      user: serializeUserSummary(updated.sender),
    };
    return NextResponse.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
