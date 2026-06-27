// GET /api/v1/plantdex/me → the caller's discovered species + collection stats + the full
// Library catalog (API_CONTRACT §plantdex). Powers the PlantDex tab grid: `entries` are the
// discovered species (each embeds its resolved Plant), and `catalog` is every Library species
// (lean shape) so the grid can render locked silhouettes for the undiscovered ones (design
// §8.9) in a single fetch.

import { NextResponse } from "next/server";
import type { CatalogPlant, PlantDexResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { serializePlantDexEntry } from "@/lib/serializers";
import { computeProfileStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });
    if (!profile) {
      throw errors.notFound("Profile not found");
    }

    const [rows, stats, catalogRows] = await Promise.all([
      prisma.plantDexEntry.findMany({
        where: { userId },
        include: { plant: true },
        orderBy: { firstDiscoveredAt: "desc" },
      }),
      computeProfileStats(userId, profile.totalPoints),
      prisma.plant.findMany({
        select: { id: true, commonName: true, scientificName: true, rarity: true, imageUrl: true },
        orderBy: { commonName: "asc" },
      }),
    ]);

    const catalog: CatalogPlant[] = catalogRows;
    const body: PlantDexResponse = {
      entries: rows.map(serializePlantDexEntry),
      stats,
      catalog,
    };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
