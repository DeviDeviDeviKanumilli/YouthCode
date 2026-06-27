# SproutGo — AI Integration

How OpenAI is used for the two AI features: plant identification and plant chat. Per the
locked decision, identification uses **OpenAI vision for MVP behind a swappable
`PlantIdentifier` interface** so a dedicated API (Plant.id / Pl@ntNet) can replace it later
without touching callers. All keys live only in the Vercel backend.

> Cross-refs: called from the `POST /observations` and `POST /chat/:plantId` pipelines in
> [API_CONTRACT](./API_CONTRACT.md); confidence threshold drives `IdStatus` in
> [DATA_MODEL](./DATA_MODEL.md); cost rules tie to [TECH_RISKS](./TECH_RISKS.md).

## Swappable identifier interface

```ts
export interface PlantIdentifier {
  identify(imageUrl: string): Promise<IdResult>;
}

export interface IdResult {
  scientificName: string;
  commonName: string | null;
  family: string | null;
  confidence: number;   // 0..1
}
```

MVP impl: `OpenAIPlantIdentifier`. Later: `PlantIdIdentifier` / `PlantNetIdentifier` — same
interface, swapped by one factory. Callers (the observations pipeline) never know which is
active.

## Identification prompt + output schema

- Send the image (Supabase Storage signed URL) to an OpenAI vision-capable model.
- Use **structured output / JSON mode** so the response is strictly parseable. Reject and
  treat as failure if it doesn't match the schema.

Required JSON:
```json
{ "scientificName": "Acer rubrum", "commonName": "Red Maple", "family": "Sapindaceae", "confidence": 0.92 }
```

System instruction (essence): "You are a botanical identifier. Given a plant photo, return
only the single most likely species as JSON matching the schema. `confidence` is your
calibrated certainty 0–1. If you cannot identify a plant, return confidence 0. Do not invent
a species to seem confident."

## Confidence threshold branching

Constant `MIN_AUTO_CREATE_CONFIDENCE = 0.85` (SPEC §3.8/§7.3):

| Outcome | Condition | Action |
|---------|-----------|--------|
| Matched existing | `scientificName` found in Library | link observation, `idStatus=MATCHED` |
| Auto-create | not found AND `confidence ≥ 0.85` | create `Plant` (`source=OPENAI`, store `confidence`), link, `MATCHED` |
| Uncertain | `confidence < 0.85` | save observation, `idStatus=UNCERTAIN`, surface "Possible match" UI; no PlantDex unlock until confirmed |

Region restriction (LIBRARY_SEED) keeps "not found" cases rare, limiting low-quality
auto-created entries.

## Plant chat

Grounded persona chat, unlocked once the plant is in the user's PlantDex (gate enforced in
`POST /chat/:plantId`).

1. Load the `Plant` Library entry (name, family, type, habitat, native status, rarity,
   description, identification tips).
2. Build a system prompt: "You are {commonName} (*{scientificName}*), speaking in first
   person. Personality: {persona}. Answer using ONLY the provided facts; if you don't know,
   say so in character. Never invent ecological facts." Inject the Library fields as facts.
3. **Personality by rarity/type** (SPEC §5): COMMON→friendly/casual, RARE→mysterious,
   INVASIVE→bold/defensive, flowers→gentle. Deterministic mapping, no model training.
4. Send recent turns + the new message; return `{ reply }`.

History: persisted as `ChatMessage` only if OPEN_QUESTIONS #5 = persist; otherwise the app
replays recent `history` each turn (session-only).

## Cost & abuse controls (SPEC §7.7)

- **Never re-identify a stored image.** Once an observation has a result, reuse it — no
  second AI call for the same `imagePath`.
- All AI calls route through the backend; the OpenAI key is a Vercel env var, never in the
  app bundle (see [REPO_STRUCTURE](./REPO_STRUCTURE.md) `.env` checklist).
- Per-user rate limits on identify and chat endpoints; chat capped per session.
- Cache Library reads used to build chat prompts.
- Log token usage per call for cost monitoring.
