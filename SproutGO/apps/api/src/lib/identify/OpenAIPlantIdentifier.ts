// OpenAI vision implementation of PlantIdentifier (AI_INTEGRATION.md). Sends the
// image URL to a vision-capable model in JSON mode with a strict botanical prompt,
// then validates the response against the IdResult schema. A non-conforming or
// unparseable response is treated as a failed identification (confidence 0) rather
// than trusting invented data. The API key is read lazily so this module imports
// cleanly without credentials present.

import OpenAI from "openai";
import { z } from "zod";
import { env } from "@/lib/env";
import type { IdResult, PlantIdentifier } from "./PlantIdentifier";

const MODEL = "gpt-4o";
const OPENAI_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT =
  "You are a botanical identifier. Given a plant photo, return ONLY the single most " +
  "likely species as JSON matching this schema: " +
  '{"scientificName": string, "commonName": string|null, "family": string|null, "confidence": number}. ' +
  "`confidence` is your calibrated certainty from 0 to 1. If you cannot identify a plant, " +
  "return confidence 0. Do not invent a species to seem confident.";

const responseSchema = z.object({
  scientificName: z.string().min(1),
  commonName: z.string().nullable(),
  family: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const FAILED: IdResult = {
  scientificName: "",
  commonName: null,
  family: null,
  confidence: 0,
};

// Pure parser for the model's raw text — exported so the failure modes (null, malformed
// JSON, schema mismatch, empty species) are unit-testable without a live OpenAI call.
// Any non-conforming output is a FAILED identification rather than trusted/invented data.
export function parseIdentification(raw: string | null | undefined): IdResult {
  if (!raw) return FAILED;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return FAILED;
  }
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success || parsed.data.scientificName.trim() === "") {
    return FAILED;
  }
  return parsed.data;
}

export class OpenAIPlantIdentifier implements PlantIdentifier {
  async identify(imageUrl: string): Promise<IdResult> {
    try {
      const client = new OpenAI({ apiKey: env.openaiApiKey });
      const completion = await client.chat.completions.create(
        {
          model: MODEL,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Identify the plant in this image." },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
        },
        { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) },
      );
      return parseIdentification(completion.choices[0]?.message.content);
    } catch {
      // Provider error, timeout/abort, or network failure — treat as a failed ID so the
      // route records UNCERTAIN instead of throwing a 500.
      return FAILED;
    }
  }
}
