// Shared API payload types used by both apps/mobile and apps/api.
// These mirror the API_CONTRACT.md response shapes. Enums come from ./enums.

import type {
  IdStatus,
  NativeStatus,
  PlantType,
  Privacy,
  Rarity,
  IdSource,
  FriendStatus,
} from "./enums";

// --- AI identification (AI_INTEGRATION.md) ---------------------------------
export interface IdResult {
  scientificName: string;
  commonName: string | null;
  family: string | null;
  confidence: number; // 0..1
}

// --- Core entities (subset of DATA_MODEL.md, serialized for the wire) ------
export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  totalPoints: number;
  isAdmin: boolean;
  createdAt: string; // ISO 8601
}

export interface ProfileStats {
  speciesDiscovered: number;
  photosSubmitted: number;
  rareFound: number;
  totalPoints: number;
  completionPct: number;
}

export interface ProfileWithStats extends Profile {
  stats: ProfileStats;
}

export interface Plant {
  id: string;
  scientificName: string;
  commonName: string | null;
  family: string | null;
  genus: string | null;
  type: PlantType;
  description: string | null;
  habitat: string | null;
  nativeStatus: NativeStatus;
  rarity: Rarity;
  imageUrl: string | null;
  // Attribution for seeded Commons images (CC licensing); null for AI-created/image-less rows.
  imageLicense: string | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
  source: IdSource;
  confidence: number | null;
  createdAt: string;
}

export interface Observation {
  id: string;
  userId: string;
  plantId: string | null;
  imagePath: string;
  latitude: number | null;
  longitude: number | null;
  confidence: number | null;
  idStatus: IdStatus;
  privacy: Privacy;
  pointsAwarded: number;
  createdAt: string;
}

// Payload the Identification Result screen renders (API_CONTRACT §observations).
export interface ObservationResult {
  observation: Observation;
  plant: Plant | null;
  confidence: number | null;
  isFirstDiscovery: boolean;
  pointsAwarded: number;
  idStatus: IdStatus;
  quotaReached?: boolean;
}

// A discovery pin on the exploration map (GET /observations?bbox=). Lean by design —
// only what a marker + its preview sheet need. Coordinates are already privacy-fuzzed
// server-side for non-owners of rare/sensitive plants (SECURITY_AND_PRIVACY §location).
export interface ObservationMarker {
  id: string;
  plantId: string | null;
  latitude: number; // fuzzed (snapped to grid) for non-owners when `fuzzed` is true
  longitude: number;
  rarity: Rarity | null; // null when UNCERTAIN / no plant linked
  isOwn: boolean; // viewer is the owner — sees exact coords
  // Relationship to the viewer — drives the map layer toggles (Mine / Friends / Community).
  source: "own" | "friend" | "public";
  fuzzed: boolean; // coords were snapped for rare-plant privacy
  plant: {
    id: string;
    commonName: string | null;
    scientificName: string;
    rarity: Rarity;
    imageUrl: string | null;
  } | null;
  createdAt: string; // ISO 8601
}

// GET /observations?bbox= response (API_CONTRACT §observations).
export interface ObservationsMapResponse {
  markers: ObservationMarker[];
}

// A discovered-species entry in a user's PlantDex (DATA_MODEL §PlantDexEntry).
export interface PlantDexEntry {
  id: string;
  plantId: string;
  firstDiscoveredAt: string; // ISO 8601
  timesObserved: number;
  plant: Plant;
}

// A lean catalog entry — every Library species, used to render locked/discovered states in
// the PlantDex grid (design §8.9) without fetching the full Plant for each.
export interface CatalogPlant {
  id: string;
  commonName: string | null;
  scientificName: string;
  rarity: Rarity;
  imageUrl: string | null;
}

// GET /plantdex/me response (API_CONTRACT §plantdex). `catalog` is the full Library so the
// grid can show locked silhouettes for undiscovered species in one fetch.
export interface PlantDexResponse {
  entries: PlantDexEntry[];
  stats: ProfileStats;
  catalog: CatalogPlant[];
}

// GET /library response (API_CONTRACT §plantdex/library). Offset-paginated.
export interface LibraryResponse {
  plants: Plant[];
  total: number;
  limit: number;
  offset: number;
}

// GET /library/:plantId response — the Plant Detail screen (design §8.11). Community photos
// and map sightings are observation markers (rare-plant coords already server-fuzzed).
export interface PlantDetailResponse {
  plant: Plant;
  communityPhotos: ObservationMarker[];
  sightings: ObservationMarker[];
}

// --- Request bodies --------------------------------------------------------
export interface CreateProfileBody {
  username: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UpdateProfileBody {
  username?: string;
  avatarUrl?: string;
  bio?: string;
}

// --- Standard error envelope (API_CONTRACT §conventions) -------------------
export interface ApiError {
  error: { code: string; message: string };
}

// --- Friend types (used from M4; defined here as the single source) --------
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendStatus;
  createdAt: string;
  respondedAt: string | null;
}

// === M4 — Social layer ======================================================

// Lean author/user summary embedded in posts, comments, friend lists, search results.
export interface UserSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

// A social feed / forum post (API_CONTRACT §social). `imageUrl` is a short-lived signed URL
// minted server-side (the observations bucket is private), null when there's no image.
// `plant` is the lean shape the "View Plant" link needs. `likedByMe`/`isOwn`/`canDelete` are
// computed for the requesting viewer.
export interface Post {
  id: string;
  author: UserSummary;
  plantId: string | null;
  imageUrl: string | null;
  title: string | null;
  caption: string | null;
  category: ForumCategory | null;
  generalLocation: string | null;
  privacy: Privacy;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isOwn: boolean;
  canDelete: boolean; // owner OR admin
  plant: {
    id: string;
    commonName: string | null;
    scientificName: string;
    rarity: Rarity;
    imageUrl: string | null;
  } | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: UserSummary;
  body: string;
  createdAt: string;
}

// GET /posts?scope=&category= — offset-paginated feed.
export interface PostsResponse {
  posts: Post[];
  limit: number;
  offset: number;
}

// GET /posts/:id — a post + its comments (a forum "thread" is this for a category post).
export interface PostDetailResponse {
  post: Post;
  comments: Comment[];
}

// POST/DELETE /posts/:id/like
export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

// A friend request paired with the counterparty (sender for incoming, receiver for outgoing).
export interface FriendRequestView {
  id: string;
  status: FriendStatus;
  createdAt: string;
  user: UserSummary;
}

export interface FriendRequestsResponse {
  box: "incoming" | "outgoing";
  requests: FriendRequestView[];
}

export interface FriendsResponse {
  friends: UserSummary[];
}

export interface UserSearchResponse {
  users: UserSummary[];
}

// Friendship state of a profile relative to the requesting viewer.
export type FriendshipStatus = "self" | "friends" | "incoming" | "outgoing" | "none";

export interface SocialProfileStats extends ProfileStats {
  postsCount: number;
  friendsCount: number;
}

// GET /profile/:id — public profile + social context. Used for both other users and self
// (friendship === "self"). isAdmin is never exposed here.
export interface PublicProfileResponse {
  profile: Omit<Profile, "isAdmin">;
  stats: SocialProfileStats;
  friendship: FriendshipStatus;
  recentDiscoveries: PlantDexEntry[];
  posts: Post[];
}

// Forum categories are a fixed client-side list stored in Post.category (no Forum/Thread
// models — forums are category-scoped posts, per API_CONTRACT). Keep in sync with the API's
// forumCategorySchema.
export const FORUM_CATEGORIES = [
  { key: "PLANT_ID", label: "Plant ID Help" },
  { key: "LOCAL_TRAILS", label: "Local Trails" },
  { key: "RARE_FINDS", label: "Rare Finds" },
  { key: "GARDENING", label: "Gardening" },
  { key: "PHOTOGRAPHY", label: "Nature Photography" },
  { key: "GENERAL", label: "General Discussion" },
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]["key"];

// === M5 — Plant chat ========================================================

// One turn in a plant conversation. "plant" is the AI persona; "user" is the caller.
export interface ChatTurn {
  role: "user" | "plant";
  content: string;
  createdAt: string; // ISO 8601
}

// GET /chat/:plantId — recent conversation, flattened to alternating turns (oldest first).
export interface ChatHistoryResponse {
  messages: ChatTurn[];
}

// POST /chat/:plantId → the plant's reply (history is persisted server-side).
export interface ChatReply {
  reply: string;
}
