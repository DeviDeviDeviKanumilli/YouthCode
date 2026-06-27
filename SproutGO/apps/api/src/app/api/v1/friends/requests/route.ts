// POST /api/v1/friends/requests          — send a friend request (API_CONTRACT §friends).
// GET  /api/v1/friends/requests?box=...   — list pending incoming/outgoing requests.

import { NextResponse } from "next/server";
import { Prisma, FriendStatus } from "@sproutgo/db";
import type { FriendRequestsResponse, FriendRequestView } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { friendRequestSchema, requestBoxSchema } from "@/lib/validation";
import { serializeUserSummary } from "@/lib/serializers";
import { orderedPair } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = friendRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const receiverId = parsed.data.receiverId;
    if (receiverId === userId) throw errors.validation("You can't friend yourself");

    const receiver = await prisma.profile.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) throw errors.notFound("User not found");

    // Already friends?
    const existingFriendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: orderedPair(userId, receiverId) },
    });
    if (existingFriendship) throw errors.conflict("You're already friends");

    // Pending request in either direction?
    const existingPending = await prisma.friendRequest.findFirst({
      where: {
        status: FriendStatus.PENDING,
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      },
    });
    if (existingPending) throw errors.conflict("A pending request already exists");

    try {
      // upsert by the unique (sender,receiver) — re-requesting after a prior reject reopens it.
      const request = await prisma.friendRequest.upsert({
        where: { senderId_receiverId: { senderId: userId, receiverId } },
        create: { senderId: userId, receiverId, status: FriendStatus.PENDING },
        update: { status: FriendStatus.PENDING, respondedAt: null },
        include: { receiver: true },
      });
      const view: FriendRequestView = {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        user: serializeUserSummary(request.receiver),
      };
      return NextResponse.json(view, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw errors.conflict("A request already exists");
      }
      throw e;
    }
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const boxParsed = requestBoxSchema.safeParse(
      new URL(req.url).searchParams.get("box") ?? "incoming",
    );
    if (!boxParsed.success) throw errors.validation("box must be incoming or outgoing");
    const box = boxParsed.data;

    const rows = await prisma.friendRequest.findMany({
      where:
        box === "incoming"
          ? { receiverId: userId, status: FriendStatus.PENDING }
          : { senderId: userId, status: FriendStatus.PENDING },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: "desc" },
    });

    const requests: FriendRequestView[] = rows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      // The counterparty: the sender for incoming, the receiver for outgoing.
      user: serializeUserSummary(box === "incoming" ? r.sender : r.receiver),
    }));

    const body: FriendRequestsResponse = { box, requests };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
