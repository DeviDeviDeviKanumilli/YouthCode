// USDA PLANTS checklist (CSV) parsing + column→Plant transforms (LIBRARY_SEED.md table).
// Pure functions, unit-tested — no network or filesystem. The maintainer exports the NE-states
// checklist to seed/data/usda-ne.raw.csv; scrape.ts reads it and runs these transforms.

import { parse } from "csv-parse/sync";
import type { NativeStatus, PlantType } from "./types";

// The subset of USDA checklist columns we consume. Real exports carry many more; we read by
// header name so extra columns are harmless.
export interface UsdaRow {
  scientificName: string; // "Scientific Name with Author" (author stripped downstream)
  commonName: string;
  family: string;
  growthHabit: string; // "Growth Habit"
  nativeStatus: string; // "Native Status" e.g. "L48 (N)"
  synonymSymbol: string; // blank for accepted names
  acceptedSymbol: string;
  stateDistribution: string; // space/comma-separated state codes, if present in the export
}

// Strip the trailing taxonomic author from a scientific name: "Acer rubrum L." → "Acer rubrum".
// Heuristic: keep the first two tokens (genus + species); drop anything after, which is the
// author/variety noise we don't want in the dedup key.
export function stripScientificAuthor(raw: string): string {
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length <= 2) return tokens.join(" ");
  return tokens.slice(0, 2).join(" ");
}

export function genusOf(scientificName: string): string | null {
  const g = scientificName.trim().split(/\s+/)[0];
  return g ? g : null;
}

// Title-case a common name, picking the primary entry when USDA lists several comma-separated.
export function pickPrimaryCommonName(raw: string): string | null {
  const first = raw.split(",")[0]?.trim();
  if (!first) return null;
  return first
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// USDA Growth Habit → PlantType.
export function mapGrowthHabit(raw: string): PlantType {
  const h = raw.toLowerCase();
  if (h.includes("tree")) return "TREE";
  if (h.includes("shrub") || h.includes("subshrub")) return "SHRUB";
  if (h.includes("graminoid")) return "GRASS";
  if (h.includes("fern") || h.includes("spore")) return "FERN";
  if (h.includes("forb") || h.includes("herb")) return "FLOWER";
  return "OTHER";
}

// USDA Native Status → NativeStatus. Codes look like "L48 (N)", "L48 (I)", "L48 (N?)".
// An explicit invasive override list (passed in) wins, since USDA doesn't flag invasiveness
// in this column.
export function mapNativeStatus(raw: string, isInvasive = false): NativeStatus {
  if (isInvasive) return "INVASIVE";
  const s = raw.toUpperCase();
  if (/\(N/.test(s)) return "NATIVE";
  if (/\(I/.test(s)) return "INTRODUCED";
  return "UNKNOWN";
}

// A row is an accepted name (not a synonym) when its Synonym Symbol is blank. Synonyms are
// dropped before insert so we never create duplicate species under old names.
export function isAcceptedName(row: Pick<UsdaRow, "synonymSymbol">): boolean {
  return row.synonymSymbol.trim() === "";
}

// Count the NE state codes present in a distribution string, intersected with the seed region.
export function countStates(stateDistribution: string, regionStates: readonly string[]): number {
  if (!stateDistribution.trim()) return 0;
  const present = new Set(
    stateDistribution
      .toUpperCase()
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return regionStates.filter((s) => present.has(s)).length;
}

// Parse a USDA checklist CSV into UsdaRow[]. Maps USDA's verbose header names to our fields;
// missing columns become empty strings (defensive — exports vary by year/filters).
export function parseUsdaCsv(csv: string): UsdaRow[] {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const pick = (r: Record<string, string>, ...names: string[]): string => {
    for (const n of names) {
      if (r[n] != null && r[n] !== "") return r[n];
    }
    return "";
  };

  return records.map((r) => ({
    scientificName: pick(r, "Scientific Name with Author", "Scientific Name", "ScientificName"),
    commonName: pick(r, "Common Name", "CommonName"),
    family: pick(r, "Family"),
    growthHabit: pick(r, "Growth Habit", "GrowthHabit"),
    nativeStatus: pick(r, "Native Status", "NativeStatus"),
    synonymSymbol: pick(r, "Synonym Symbol", "SynonymSymbol"),
    acceptedSymbol: pick(r, "Accepted Symbol", "AcceptedSymbol", "Symbol"),
    stateDistribution: pick(r, "State Distribution", "StateDistribution", "Distribution"),
  }));
}
