// OpenAI implementation of PlantChatter (AI_INTEGRATION.md §plant chat). Sends the grounded
// system prompt + recent turns + the new message to a chat model. The key is read lazily so
// the module imports cleanly without credentials. Throws on provider failure so the route can
// surface an error rather than fabricate a reply.

import OpenAI from "openai";
import { env } from "@/lib/env";
import type { PlantChatInput, PlantChatter } from "./PlantChatter";

const MODEL = "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 20_000;
const MAX_TOKENS = 300;

export class OpenAIPlantChatter implements PlantChatter {
  async reply(input: PlantChatInput): Promise<string> {
    const client = new OpenAI({ apiKey: env.openaiApiKey });
    const completion = await client.chat.completions.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: input.systemPrompt },
          // The plant persona maps to the assistant role; the caller to the user role.
          ...input.history.map((t) => ({
            role: t.role === "plant" ? ("assistant" as const) : ("user" as const),
            content: t.content,
          })),
          { role: "user", content: input.message },
        ],
      },
      { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) },
    );
    const text = completion.choices[0]?.message.content?.trim();
    if (!text) throw new Error("Empty chat completion");
    return text;
  }
}
