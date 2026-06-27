// Request-body validation schemas (zod) — validated at every route boundary
// (SECURITY_AND_PRIVACY §input hardening). Never trust a client-supplied userId.

import { z } from "zod";

// Server-side 13+ attestation (SECURITY_AND_PRIVACY §audience). The client signup check
// is UX-only and bypassable, so age is enforced here at profile creation.
const atLeast13 = (dob: string): boolean => {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 13);
  return d <= cutoff;
};

export const createProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must be YYYY-MM-DD")
    .refine(atLeast13, "You must be at least 13 years old to use SproutGo"),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(300).optional(),
});

export const updateProfileSchema = z
  .object({
    username: createProfileSchema.shape.username.optional(),
    avatarUrl: z.string().url().optional(),
    bio: z.string().max(300).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// POST /observations — the capture→identify pipeline input (API_CONTRACT §observations).
// imagePath is a Supabase Storage path; the route additionally enforces that it lives
// under the caller's own prefix (never trust the client to scope itself).
export const createObservationSchema = z.object({
  imagePath: z
    .string()
    .trim()
    .min(1, "imagePath is required")
    // Storage keys are a flat namespace, but this string is the only path guard, so reject
    // traversal/control chars defensively (the route also pins it under the caller prefix).
    .regex(/^[A-Za-z0-9._\-/]+$/, "imagePath has invalid characters")
    .refine((p) => !p.includes(".."), "imagePath may not contain '..'"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
});

export type CreateObservationInput = z.infer<typeof createObservationSchema>;

// PATCH /observations/:id — owner changes the visibility of an existing capture.
export const updateObservationSchema = z.object({
  privacy: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
});

export type UpdateObservationInput = z.infer<typeof updateObservationSchema>;

// GET /library?q=&type=&rarity=&native=&sort=&limit=&offset= — Library catalog browse.
// Faceted filters map to the Plant B-tree indexes; `q` is a case-insensitive name match
// (no FTS for MVP — see LIBRARY_SEED.md). All params optional; parse before validating.
export const LIBRARY_PAGE_DEFAULT = 30;
export const LIBRARY_PAGE_MAX = 100;

export const librarySortSchema = z.enum(["name", "rarity", "recent"]);
export type LibrarySort = z.infer<typeof librarySortSchema>;

export const libraryQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["TREE", "FLOWER", "SHRUB", "FERN", "GRASS", "OTHER"]).optional(),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "LEGENDARY"]).optional(),
  native: z.enum(["NATIVE", "INTRODUCED", "INVASIVE", "UNKNOWN"]).optional(),
  sort: librarySortSchema.default("name"),
  limit: z.coerce.number().int().min(1).max(LIBRARY_PAGE_MAX).default(LIBRARY_PAGE_DEFAULT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type LibraryQueryInput = z.infer<typeof libraryQuerySchema>;

// Parse the URLSearchParams of GET /library into a validated query. Unknown/blank params are
// dropped (treated as absent) so a bare `?type=` doesn't fail the enum. Returns null on any
// invalid value so the route can 400.
export function parseLibraryQuery(params: URLSearchParams): LibraryQueryInput | null {
  const raw: Record<string, string> = {};
  for (const key of ["q", "type", "rarity", "native", "sort", "limit", "offset"] as const) {
    const v = params.get(key);
    if (v != null && v.trim() !== "") raw[key] = v.trim();
  }
  const parsed = libraryQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// GET /observations?bbox=minLng,minLat,maxLng,maxLat — map bounding-box query.
// Parse the CSV string into this shape before validating.
export const bboxSchema = z
  .object({
    minLng: z.number().min(-180).max(180),
    minLat: z.number().min(-90).max(90),
    maxLng: z.number().min(-180).max(180),
    maxLat: z.number().min(-90).max(90),
  })
  .refine((b) => b.minLng <= b.maxLng && b.minLat <= b.maxLat, {
    message: "bbox min must be <= max",
  });

export type BboxInput = z.infer<typeof bboxSchema>;

// Parse a `bbox=minLng,minLat,maxLng,maxLat` query string into validated numbers.
// Returns null on any malformed/out-of-range input so the route can 400.
export function parseBbox(raw: string | null): BboxInput | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  const parsed = bboxSchema.safeParse({ minLng, minLat, maxLng, maxLat });
  return parsed.success ? parsed.data : null;
}

// === M4 — Social layer ======================================================

// Forum categories are stored in Post.category (no Forum/Thread models). Keep in sync with
// packages/shared FORUM_CATEGORIES.
export const forumCategorySchema = z.enum([
  "PLANT_ID",
  "LOCAL_TRAILS",
  "RARE_FINDS",
  "GARDENING",
  "PHOTOGRAPHY",
  "GENERAL",
]);

// POST /posts — share a discovery or open a forum thread. Either references an existing
// observation (image/plant inherited server-side) or carries its own imagePath/plantId.
export const createPostSchema = z
  .object({
    observationId: z.string().uuid().optional(),
    plantId: z.string().uuid().optional(),
    imagePath: z
      .string()
      .trim()
      .min(1)
      .regex(/^[A-Za-z0-9._\-/]+$/, "imagePath has invalid characters")
      .refine((p) => !p.includes(".."), "imagePath may not contain '..'")
      .optional(),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(2000).optional(),
    category: forumCategorySchema.optional(),
    generalLocation: z.string().trim().max(120).optional(),
    privacy: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).default("PUBLIC"),
  })
  .refine((d) => d.observationId || d.plantId || d.caption || d.title, {
    message: "A post needs at least an observation, plant, caption, or title",
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

// GET /posts?scope=&category=&limit=&offset=
export const POSTS_PAGE_DEFAULT = 20;
export const POSTS_PAGE_MAX = 50;
export const postsScopeSchema = z.enum(["feed", "friends", "forum"]);
export type PostsScope = z.infer<typeof postsScopeSchema>;

export const postsQuerySchema = z.object({
  scope: postsScopeSchema.default("feed"),
  category: forumCategorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(POSTS_PAGE_MAX).default(POSTS_PAGE_DEFAULT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PostsQueryInput = z.infer<typeof postsQuerySchema>;

export function parsePostsQuery(params: URLSearchParams): PostsQueryInput | null {
  const raw: Record<string, string> = {};
  for (const key of ["scope", "category", "limit", "offset"] as const) {
    const v = params.get(key);
    if (v != null && v.trim() !== "") raw[key] = v.trim();
  }
  const parsed = postsQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// POST /posts/:id/comments
export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// POST /posts/:id/report
export const reportSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required").max(500),
});
export type ReportInput = z.infer<typeof reportSchema>;

// POST /friends/requests
export const friendRequestSchema = z.object({
  receiverId: z.string().uuid("receiverId must be a valid id"),
});
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;

// PATCH /friends/requests/:id
export const friendRequestActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});
export type FriendRequestActionInput = z.infer<typeof friendRequestActionSchema>;

// GET /users/search?q= and GET /friends/requests?box=
export const userSearchSchema = z.object({
  q: z.string().trim().min(1, "search query is required").max(50),
});

export const requestBoxSchema = z.enum(["incoming", "outgoing"]);
export type RequestBox = z.infer<typeof requestBoxSchema>;

// POST /chat/:plantId — one message to a plant persona. History is server-side (persisted),
// so the body is just the new message.
export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "Say something to the plant").max(1000),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
