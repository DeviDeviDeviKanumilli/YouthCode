// Centralized scoring config — single source of truth for points & rarity.
// Source: currentPlans/POINTS_AND_RARITY.md. All values are tunable here so
// balancing never requires touching route logic. Unit tests pin these formulas.

import { Rarity } from "./enums";

export const SCORING = {
  base: { COMMON: 10, UNCOMMON: 25, RARE: 60, LEGENDARY: 150 },
  firstDiscoveryMultiplier: 2.0,
  dupFactor: 0.5,
  dupCapIndex: 4, // floor stops decaying past the 4th dup
  minDupPoints: 1, // never award 0 for a valid capture
  dailySameSpeciesCap: 5, // OPEN_QUESTIONS #4 — tunable
  // Capture rate limits — enforced BEFORE the expensive identify call to protect OpenAI
  // cost and the DB from abuse (independent of the per-species points cap above).
  captureWindowSeconds: 60,
  captureWindowMax: 10, // max captures per rolling window
  dailyCaptureCap: 100, // max total captures per UTC day
  idempotencyWindowSeconds: 3600, // re-submitting the same imagePath within 1h is a no-op
  // Plant-chat limits (AI_INTEGRATION.md §cost) — protect OpenAI spend; counted from
  // persisted ChatMessage rows.
  chatWindowSeconds: 60,
  chatWindowMax: 15, // max chat turns per rolling window
  chatHistoryTurns: 12, // recent exchanges replayed into the prompt + loaded on open
} as const;

// AI auto-create confidence threshold (AI_INTEGRATION.md / SPEC §3.8, §7.3).
export const MIN_AUTO_CREATE_CONFIDENCE = 0.85;

export function basePoints(rarity: Rarity): number {
  return SCORING.base[rarity];
}

/** Points for a first-time discovery of a species. */
export function firstDiscoveryPoints(rarity: Rarity): number {
  return Math.round(basePoints(rarity) * SCORING.firstDiscoveryMultiplier);
}

/**
 * Points for re-photographing an already-discovered species.
 * Decays with prior observation count, floored at MIN_DUP_POINTS.
 * `priorTimesObserved` = how many times the user has already logged this species.
 */
export function duplicatePoints(rarity: Rarity, priorTimesObserved: number): number {
  const exponent = Math.min(Math.max(priorTimesObserved, 1), SCORING.dupCapIndex);
  const raw = basePoints(rarity) * Math.pow(SCORING.dupFactor, exponent);
  return Math.max(Math.round(raw), SCORING.minDupPoints);
}
