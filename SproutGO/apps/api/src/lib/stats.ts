// Shared PlantDex/profile collection stats. Used by GET /profile/me and GET /plantdex/me,
// which previously each carried an identical copy of this computation.

import type { ProfileStats } from "@sproutgo/shared";
import { Rarity } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";

// `totalPoints` is passed in by the caller (which already has the Profile row) to avoid an
// extra query; the rest is counted here. completionPct is species-discovered / library-size,
// rounded to one decimal (0 when the Library is empty).
export async function computeProfileStats(
  userId: string,
  totalPoints: number,
): Promise<ProfileStats> {
  const [speciesDiscovered, photosSubmitted, rareFound, librarySize] = await Promise.all([
    prisma.plantDexEntry.count({ where: { userId } }),
    prisma.observation.count({ where: { userId } }),
    prisma.plantDexEntry.count({
      where: { userId, plant: { rarity: { in: [Rarity.RARE, Rarity.LEGENDARY] } } },
    }),
    prisma.plant.count(),
  ]);
  const completionPct =
    librarySize > 0 ? Math.round((speciesDiscovered / librarySize) * 1000) / 10 : 0;
  return { speciesDiscovered, photosSubmitted, rareFound, totalPoints, completionPct };
}
