// GET /api/v1/library?q=&type=&rarity=&native=&sort=&limit=&offset=
// The global Library browse/search (API_CONTRACT §plantdex/library, design §8.10). Faceted
// filters hit the Plant B-tree indexes; `q` is a case-insensitive name match (no FTS for MVP).
// The Library is small (a few hundred seeded species), so we apply the chosen sort — including
// the rarity-tier order Prisma's alphabetical enum sort can't express — and paginate the
// filtered set in-memory, returning `total` for the client.

import { NextResponse } from "next/server";
import type { LibraryResponse } from "@sproutgo/shared";
import { Prisma } from "@sproutgo/db";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { parseLibraryQuery } from "@/lib/validation";
import { serializePlant } from "@/lib/serializers";
import { compareBy } from "@/lib/librarySort";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAuth(req);

    const query = parseLibraryQuery(new URL(req.url).searchParams);
    if (!query) {
      throw errors.validation("Invalid library query parameters");
    }
    const { q, type, rarity, native, sort, limit, offset } = query;

    const where: Prisma.PlantWhereInput = {};
    if (type) where.type = type;
    if (rarity) where.rarity = rarity;
    if (native) where.nativeStatus = native;
    if (q) {
      where.OR = [
        { commonName: { contains: q, mode: "insensitive" } },
        { scientificName: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.plant.findMany({ where });
    const plants = rows.map(serializePlant).sort(compareBy(sort));
    const page = plants.slice(offset, offset + limit);

    const body: LibraryResponse = { plants: page, total: plants.length, limit, offset };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
