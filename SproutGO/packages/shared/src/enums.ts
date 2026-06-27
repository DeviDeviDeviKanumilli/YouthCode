// Single source of truth for enums shared by mobile + api.
// Mirrored by the Prisma enums in packages/db/prisma/schema.prisma — keep in sync.
// (Prisma is generator of record for the DB; this file is the source for app code.)

export const Rarity = {
  COMMON: "COMMON",
  UNCOMMON: "UNCOMMON",
  RARE: "RARE",
  LEGENDARY: "LEGENDARY",
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];

export const NativeStatus = {
  NATIVE: "NATIVE",
  INTRODUCED: "INTRODUCED",
  INVASIVE: "INVASIVE",
  UNKNOWN: "UNKNOWN",
} as const;
export type NativeStatus = (typeof NativeStatus)[keyof typeof NativeStatus];

export const Privacy = {
  PUBLIC: "PUBLIC",
  FRIENDS: "FRIENDS",
  PRIVATE: "PRIVATE",
} as const;
export type Privacy = (typeof Privacy)[keyof typeof Privacy];

export const FriendStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  BLOCKED: "BLOCKED",
} as const;
export type FriendStatus = (typeof FriendStatus)[keyof typeof FriendStatus];

export const IdStatus = {
  PENDING: "PENDING",
  MATCHED: "MATCHED",
  UNCERTAIN: "UNCERTAIN",
} as const;
export type IdStatus = (typeof IdStatus)[keyof typeof IdStatus];

export const PlantType = {
  TREE: "TREE",
  FLOWER: "FLOWER",
  SHRUB: "SHRUB",
  FERN: "FERN",
  GRASS: "GRASS",
  OTHER: "OTHER",
} as const;
export type PlantType = (typeof PlantType)[keyof typeof PlantType];

export const IdSource = {
  OPENAI: "OPENAI",
  PLANTID: "PLANTID",
  PLANTNET: "PLANTNET",
  SEED: "SEED",
  MANUAL: "MANUAL",
} as const;
export type IdSource = (typeof IdSource)[keyof typeof IdSource];
