// Design tokens — single source of truth for color, spacing, radius, typography.
// Source: Google Stitch exports (Material 3 token ramp). This SUPERSEDES the
// design.md-derived palette; the correction is recorded in
// currentPlans/DESIGN_SYSTEM.md (InitalPlans/design.md is frozen).
// Rule: no one-off colors, no random margins, no per-screen radii.

export const colors = {
  // Surfaces / backgrounds (M3 surface ramp)
  bg: "#f5fbee", // background / surface — base screen color
  bgSoft: "#f0f6e8", // surface-container-low — soft elevated panels
  surface: "#f5fbee",
  surfaceLowest: "#ffffff", // surface-container-lowest — cards
  surfaceLow: "#f0f6e8",
  surfaceContainer: "#eaf0e3",
  surfaceHigh: "#e4eadd",
  surfaceHighest: "#dee5d7",
  surfaceVariant: "#dee5d7",
  surfaceDim: "#d6dccf",

  // Primary
  primary: "#006c0c", // Primary Green
  primaryContainer: "#1c871e",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#f8fff0",
  deep: "#171d15", // on-surface — high-emphasis headings

  // Secondary / tertiary
  secondary: "#3b6751",
  secondaryContainer: "#bbeacf",
  onSecondaryContainer: "#406b56",
  tertiary: "#a52a66",

  // Accents
  mint: "#bbeacf", // secondary-container — success / progress fills
  sage: "#becab7", // outline-variant — borders, dividers
  gold: "#D4AF37", // accent-gold — reward accent (use sparingly)
  danger: "#ba1a1a", // error
  dangerContainer: "#fde8e8", // error-container — tint behind destructive icons/rows
  statusError: "#D32F2F",

  // Text
  text: "#171d15", // on-surface
  textMuted: "#3f4a3b", // on-surface-variant
  textInverse: "#ffffff", // on-primary

  // Outlines / inverse
  outline: "#6f7a6a",
  outlineVariant: "#becab7",
  inverseSurface: "#2c3229",
  inversePrimary: "#77dd6a",

  // Rarity (always pair with a label, never color alone — accessibility)
  rarity: {
    COMMON: "#228B22", // Forest Green
    UNCOMMON: "#20B2AA", // Light Sea Green
    RARE: "#800080", // Purple
    LEGENDARY: "#D4AF37", // Gold
  },
} as const;

// 8-point spacing system. Do not use random margins.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16, // gutter — standard padding inside cards/controls
  lg: 24, // container margin — standard screen margin
  xl: 32, // major section separation
  xxl: 40, // hero / reward screens
} as const;

// Corner radius (M3 + per-component values from Stitch exports)
export const radius = {
  button: 16,
  card: 20, // plant/library cards
  cardLarge: 24, // feed cards
  image: 20,
  sheet: 28, // bottom sheet top radius
  modal: 40, // reward / discovery modals
  pill: 999, // fully rounded chips/badges
} as const;

// Typography roles — Plus Jakarta Sans (display) + Inter (body).
export const typography = {
  largeTitle: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.5, color: colors.deep },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const, color: colors.deep },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const, color: colors.text },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const, color: colors.textMuted },
  scientificName: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const, fontStyle: "italic" as const, color: colors.textMuted },
  badge: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.6 },
} as const;

export const theme = { colors, spacing, radius, typography } as const;
export type Theme = typeof theme;
