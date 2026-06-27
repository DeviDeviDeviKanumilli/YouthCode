// Deterministic offline chatter for dev/test (no OpenAI key). Stays in character enough to
// exercise the UI without a live call. NEVER used in production (the factory throws there).

import type { PlantChatInput, PlantChatter } from "./PlantChatter";

export class StubPlantChatter implements PlantChatter {
  async reply(input: PlantChatInput): Promise<string> {
    const trimmed = input.message.trim().replace(/\s+/g, " ");
    return `You asked: "${trimmed}". I'm only a quiet stand-in for now, but I'd love to tell you more once my real voice is connected.`;
  }
}
