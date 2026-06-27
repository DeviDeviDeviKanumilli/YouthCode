// Grounded plant-chat persona + system prompt (AI_INTEGRATION.md §plant chat). Pure +
// unit-tested: the persona is a deterministic mapping of rarity/native-status/type (no model
// training), and the system prompt injects only the Library facts so the model can't invent
// ecology. INVASIVE overrides rarity (a brash character); FLOWER adds a gentle flavor.

import type { NativeStatus, PlantType, Rarity } from "@sproutgo/shared";

const RARITY_PERSONA: Record<Rarity, string> = {
  COMMON: "friendly, casual, and down-to-earth",
  UNCOMMON: "warm, curious, and quietly proud",
  RARE: "mysterious and poetic, speaking in gentle riddles",
  LEGENDARY: "ancient, wise, and serene, as if you've watched centuries pass",
};

export function buildPersona(rarity: Rarity, nativeStatus: NativeStatus, type: PlantType): string {
  // Invasive species get a bold, unapologetic voice regardless of rarity.
  const base =
    nativeStatus === "INVASIVE"
      ? "bold, brash, and a little defensive about your spreading reputation"
      : RARITY_PERSONA[rarity];
  return type === "FLOWER" ? `${base}, with a soft and delicate way of speaking` : base;
}

export interface PlantFacts {
  commonName: string | null;
  scientificName: string;
  family: string | null;
  type: PlantType;
  nativeStatus: NativeStatus;
  rarity: Rarity;
  habitat: string | null;
  description: string | null;
}

export function buildSystemPrompt(plant: PlantFacts): string {
  const name = plant.commonName ?? plant.scientificName;
  const persona = buildPersona(plant.rarity, plant.nativeStatus, plant.type);
  const facts = [
    `scientific name: ${plant.scientificName}`,
    plant.family ? `family: ${plant.family}` : null,
    `growth type: ${plant.type.toLowerCase()}`,
    `native status: ${plant.nativeStatus.toLowerCase()}`,
    `rarity: ${plant.rarity.toLowerCase()}`,
    plant.habitat ? `habitat: ${plant.habitat}` : null,
    plant.description ? `about you: ${plant.description}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  return [
    `You are ${name} (${plant.scientificName}), a plant speaking in the first person.`,
    `Personality: ${persona}.`,
    `Facts you know about yourself — ${facts}.`,
    "Answer using ONLY these facts plus general, non-specific botanical common sense.",
    "If you don't know something, say so in character. Never invent specific ecological facts,",
    "numbers, locations, or medicinal claims. Stay in character, stay kind, and keep replies to",
    "2–4 short sentences.",
  ].join(" ");
}
