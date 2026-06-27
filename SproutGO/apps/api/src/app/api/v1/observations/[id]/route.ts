// PATCH /api/v1/observations/:id — change the visibility of one of YOUR observations.
// Captures default to PRIVATE (SECURITY_AND_PRIVACY §location); this is how a user opts a
// discovery up to FRIENDS/PUBLIC when they share it. Owner-only: the auth boundary scopes
// the update to the caller's own row (R3 — service-role Prisma bypasses RLS).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { updateObservationSchema } from "@/lib/validation";
import { serializeObservation } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = updateObservationSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    // Scope to the owner: updateMany returns count 0 (not an error) when the row isn't
    // the caller's, so we never leak whether someone else's observation id exists.
    const { count } = await prisma.observation.updateMany({
      where: { id: params.id, userId },
      data: { privacy: parsed.data.privacy },
    });
    if (count === 0) {
      throw errors.notFound("Observation not found");
    }

    const updated = await prisma.observation.findUniqueOrThrow({ where: { id: params.id } });
    return NextResponse.json(serializeObservation(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
