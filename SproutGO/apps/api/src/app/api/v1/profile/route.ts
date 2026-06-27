// POST /api/v1/profile — create the caller's Profile row (keyed to the auth user id).
// API_CONTRACT §auth/profile. Signup/login are handled by the Supabase client SDK in
// the app; the backend only manages the Profile row keyed to the authenticated user.

import { NextResponse } from "next/server";
import { Prisma } from "@sproutgo/db";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { createProfileSchema } from "@/lib/validation";
import { serializeProfile } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = createProfileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const existing = await prisma.profile.findUnique({ where: { id: userId } });
    if (existing) {
      throw errors.conflict("Profile already exists");
    }

    try {
      // Write uses the authenticated id — never a client-supplied userId.
      const profile = await prisma.profile.create({
        data: {
          id: userId,
          username: parsed.data.username,
          // 13+ enforced by the schema refine — stored as the server's age attestation.
          dateOfBirth: new Date(parsed.data.dateOfBirth),
          avatarUrl: parsed.data.avatarUrl ?? null,
          bio: parsed.data.bio ?? null,
        },
      });
      return NextResponse.json(serializeProfile(profile), { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw errors.conflict("Username taken");
      }
      throw e;
    }
  } catch (err) {
    return errorResponse(err);
  }
}
