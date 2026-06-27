// Re-export the scoring config from @sproutgo/shared so backend route logic and
// unit tests reference one source of truth (POINTS_AND_RARITY.md).
export {
  SCORING,
  MIN_AUTO_CREATE_CONFIDENCE,
  basePoints,
  firstDiscoveryPoints,
  duplicatePoints,
} from "@sproutgo/shared";
