// Phase B — `npm run db:seed` (offline, idempotent). Reads the committed normalized Library
// dataset and inserts it with createMany({ skipDuplicates }), deduped on the unique
// scientificName. No network: all data comes from seed/plants.normalized.json (produced by the
// maintainer-only seed:scrape). Re-running inserts nothing new. See LIBRARY_SEED.md.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma, Prisma } from "../src/index";
import type { NormalizedSeedFile } from "./lib/types";
import { assertValidSeedFile, toPlantCreateInput } from "./lib/loader";

const OUT_JSON = fileURLToPath(new URL("./plants.normalized.json", import.meta.url));

function loadSeedFile(): NormalizedSeedFile {
  if (!existsSync(OUT_JSON)) {
    throw new Error(
      `Missing ${OUT_JSON}. Run \`npm run db:seed:scrape\` to generate it (network), ` +
        `or commit a normalized dataset. See LIBRARY_SEED.md.`,
    );
  }
  const file = JSON.parse(readFileSync(OUT_JSON, "utf8")) as NormalizedSeedFile;
  assertValidSeedFile(file);
  return file;
}

async function main(): Promise<void> {
  const file = loadSeedFile();
  console.log(`[seed] loading ${file.plants.length} species (generated ${file.generatedAt})`);

  const data: Prisma.PlantCreateManyInput[] = file.plants.map(toPlantCreateInput);

  const result = await prisma.plant.createMany({ data, skipDuplicates: true });
  const total = await prisma.plant.count();
  const withImage = await prisma.plant.count({ where: { imageUrl: { not: null } } });
  console.log(
    `[seed] inserted=${result.count} (skipped ${file.plants.length - result.count} existing); ` +
      `Library now has ${total} plant(s), ${withImage} with images.`,
  );
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
