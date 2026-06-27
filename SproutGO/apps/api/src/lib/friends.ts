// Friend-visibility helper. Accepted friendships are materialized one row per pair
// (userAId < userBId), so the viewer may sit in either column — collect ids from both sides.
// Used by privacy-filtered reads (map bbox query, Library plant detail) to resolve who the
// caller is allowed to see FRIENDS-scoped content from.

import { FriendStatus } from "@sproutgo/db";
import type { FriendshipStatus } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";

export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  return friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId));
}

// Friendship rows are stored one per pair, ordered userAId < userBId. Normalize any two ids
// to that canonical ordering for create/lookup/delete.
export function orderedPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

// The caller's relationship to another user, for the public profile + add-friend UI.
export async function computeFriendship(
  callerId: string,
  targetId: string,
): Promise<FriendshipStatus> {
  if (callerId === targetId) return "self";
  const pair = orderedPair(callerId, targetId);
  const [friendship, pending] = await Promise.all([
    prisma.friendship.findUnique({ where: { userAId_userBId: pair } }),
    prisma.friendRequest.findFirst({
      where: {
        status: FriendStatus.PENDING,
        OR: [
          { senderId: callerId, receiverId: targetId },
          { senderId: targetId, receiverId: callerId },
        ],
      },
      select: { senderId: true },
    }),
  ]);
  if (friendship) return "friends";
  if (pending) return pending.senderId === callerId ? "outgoing" : "incoming";
  return "none";
}
