// The swappable species-identification boundary (AI_INTEGRATION.md). Callers depend
// ONLY on this interface + the factory in ./index — never on a concrete adapter — so
// the MVP OpenAI vision impl can be replaced (PlantID, PlantNet) without route changes.

import type { IdResult } from "@sproutgo/shared";

export type { IdResult };

export interface PlantIdentifier {
  /** Identify the single most likely species for the image at `imageUrl`. */
  identify(imageUrl: string): Promise<IdResult>;
}
