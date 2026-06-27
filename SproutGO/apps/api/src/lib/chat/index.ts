// Factory selecting the active PlantChatter (mirrors getPlantIdentifier). Uses OpenAI when a
// key is present, else the deterministic stub for local dev/CI — but NEVER the stub in
// production (refuse, rather than ship a fake persona).

import type { PlantChatter } from "./PlantChatter";
import { StubPlantChatter } from "./StubPlantChatter";
import { OpenAIPlantChatter } from "./OpenAIPlantChatter";

export type { PlantChatter, PlantChatInput, PlantChatTurn } from "./PlantChatter";

export function getPlantChatter(): PlantChatter {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIPlantChatter();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("OPENAI_API_KEY is required in production; refusing to use the chat stub.");
  }
  return new StubPlantChatter();
}
