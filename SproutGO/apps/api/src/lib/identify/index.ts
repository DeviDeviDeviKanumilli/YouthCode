// Factory that selects the active PlantIdentifier. Routes call getPlantIdentifier()
// and depend only on the interface, so swapping providers never touches pipeline code.
// Falls back to the deterministic stub when OPENAI_API_KEY is absent, keeping local
// dev, CI, and tests runnable without live credentials.

import type { PlantIdentifier } from "./PlantIdentifier";
import { StubPlantIdentifier } from "./StubPlantIdentifier";
import { OpenAIPlantIdentifier } from "./OpenAIPlantIdentifier";

export type { IdResult, PlantIdentifier } from "./PlantIdentifier";

export function getPlantIdentifier(): PlantIdentifier {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIPlantIdentifier();
  }
  // The deterministic stub returns high-confidence IDs offline, so it must NEVER run in
  // production — that would let any authenticated caller mint observations/points without
  // a real image. Refuse instead of silently degrading.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "OPENAI_API_KEY is required in production; refusing to use the stub identifier.",
    );
  }
  return new StubPlantIdentifier();
}

/** True when real identification is active (OpenAI). Drives Storage verification + signed
 *  URLs, which only apply to live captures — the offline stub skips them in dev/test. */
export function usesRealIdentifier(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
