// Mock data for the presentational UI build. No API/network — screens render from
// these fixtures so the full navigation + visual system can be reviewed before M1
// wiring. Shapes intentionally track @sproutgo/shared types where practical.
import type { IconName } from "@/components/Icon";

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";

export interface MockPlant {
  id: string;
  commonName: string;
  scientificName: string;
  rarity: Rarity;
  discovered: boolean;
  type: string;
  imageUrl: string | null;
  location?: string;
  biome?: string;
  description: string;
  habitat: string;
  nativeStatus: string;
  points: number;
}

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

export const rarityLabel: Record<Rarity, string> = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  LEGENDARY: "Legendary",
};

export const plants: MockPlant[] = [
  {
    id: "monstera",
    commonName: "Swiss Cheese Plant",
    scientificName: "Monstera deliciosa",
    rarity: "COMMON",
    discovered: true,
    type: "Flower",
    imageUrl: img("photo-1614594975525-e45190c55d0b"),
    location: "City Park",
    description:
      "A popular houseplant recognizable by its large, glossy leaves with natural holes. Native to tropical forests, it climbs trees using aerial roots.",
    habitat: "Tropical rainforests of southern Mexico and Panama, climbing tree trunks toward the canopy.",
    nativeStatus: "Native",
    points: 65,
  },
  {
    id: "snake-plant",
    commonName: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    rarity: "UNCOMMON",
    discovered: true,
    type: "Succulent",
    imageUrl: img("photo-1593482892290-f54927ae1bb6"),
    location: "Home",
    description:
      "A hardy succulent with tall, stiff, upright leaves edged in yellow. Tolerates low light and irregular watering.",
    habitat: "Rocky, dry habitats across tropical West Africa.",
    nativeStatus: "Introduced",
    points: 90,
  },
  {
    id: "ghost-orchid",
    commonName: "Ghost Orchid",
    scientificName: "Dendrophylax lindenii",
    rarity: "RARE",
    discovered: false,
    type: "Flower",
    imageUrl: img("photo-1566907225472-514215c8a37b"),
    biome: "Swamp Biome",
    description:
      "A leafless, elusive orchid whose translucent white blooms appear to float in the air. One of the rarest flowers in North America.",
    habitat: "Humid, shaded swamps of Florida and Cuba, clinging to pop ash and pond apple bark.",
    nativeStatus: "Native",
    points: 200,
  },
  {
    id: "fiddle-leaf",
    commonName: "Fiddle Leaf Fig",
    scientificName: "Ficus lyrata",
    rarity: "COMMON",
    discovered: true,
    type: "Tree",
    imageUrl: img("photo-1597055181300-e3633a917f1c"),
    location: "Office",
    description:
      "A statement tree with large, heavily veined, violin-shaped leaves. A favorite of bright interiors.",
    habitat: "Lowland tropical rainforest of western Africa.",
    nativeStatus: "Introduced",
    points: 65,
  },
  {
    id: "pothos",
    commonName: "Golden Pothos",
    scientificName: "Epipremnum aureum",
    rarity: "COMMON",
    discovered: true,
    type: "Flower",
    imageUrl: img("photo-1572688484438-313a6e50c333"),
    location: "Living Room",
    description:
      "A trailing vine with heart-shaped, variegated green and yellow leaves. Nearly impossible to kill.",
    habitat: "Tropical forests of French Polynesia, trailing along the forest floor and up trunks.",
    nativeStatus: "Introduced",
    points: 65,
  },
  {
    id: "maidenhair",
    commonName: "Maidenhair Fern",
    scientificName: "Adiantum pedatum",
    rarity: "UNCOMMON",
    discovered: true,
    type: "Fern",
    imageUrl: img("photo-1509423350716-97f9360b4e09"),
    location: "Creek Trail",
    description:
      "A delicate fern with fan-shaped, bright green leaflets on thin, dark, wiry stems.",
    habitat: "Moist, shaded woodland and stream banks across temperate North America.",
    nativeStatus: "Native",
    points: 90,
  },
  {
    id: "corpse-flower",
    commonName: "Corpse Flower",
    scientificName: "Amorphophallus titanum",
    rarity: "LEGENDARY",
    discovered: false,
    type: "Flower",
    imageUrl: null,
    biome: "Rainforest Biome",
    description:
      "Produces the largest unbranched inflorescence in the world, famed for its powerful odor of decay when it blooms.",
    habitat: "Rainforests of western Sumatra, on steep limestone slopes.",
    nativeStatus: "Native",
    points: 500,
  },
  {
    id: "red-maple",
    commonName: "Red Maple",
    scientificName: "Acer rubrum",
    rarity: "RARE",
    discovered: false,
    type: "Tree",
    imageUrl: img("photo-1507371341162-763b5e419408"),
    biome: "Forest Biome",
    description:
      "A fast-growing tree celebrated for its brilliant red autumn foliage and early spring flowers.",
    habitat: "Wetlands, forests, and roadsides across eastern North America.",
    nativeStatus: "Native",
    points: 150,
  },
];

export const plantById = (id: string): MockPlant | undefined =>
  plants.find((p) => p.id === id);

export interface PlantTypeChip {
  key: string;
  label: string;
  icon: IconName;
  count: number;
}

export const plantTypeChips: PlantTypeChip[] = [
  { key: "trees", label: "Trees", icon: "park", count: 15 },
  { key: "flowers", label: "Flowers", icon: "local-florist", count: 42 },
  { key: "ferns", label: "Ferns", icon: "grass", count: 15 },
];

export const dexProgress = { discovered: 72, total: 300 };

// --- Feed ------------------------------------------------------------------
export interface FeedPost {
  id: string;
  author: string;
  avatarUrl: string;
  timeAgo: string;
  location: string;
  plantId: string;
  caption: string;
  likes: number;
  comments: number;
}

export const feedPosts: FeedPost[] = [
  {
    id: "p1",
    author: "Alex River",
    avatarUrl: img("photo-1500648767791-00dcc994a43e"),
    timeAgo: "2 hours ago",
    location: "Redwood National Park",
    plantId: "ghost-orchid",
    caption:
      "I can't believe I finally spotted one! Deep in the swamp, practically invisible until the sunlight caught its petals just right. A true phantom of the forest.",
    likes: 124,
    comments: 12,
  },
  {
    id: "p2",
    author: "Maya Lin",
    avatarUrl: img("photo-1438761681033-6461ffad8d80"),
    timeAgo: "5 hours ago",
    location: "Urban Trail",
    plantId: "monstera",
    caption:
      "Found this absolute unit growing wild near the edge of the park trail. Look at the size of those fenestrations!",
    likes: 45,
    comments: 3,
  },
  {
    id: "p3",
    author: "Sam Okafor",
    avatarUrl: img("photo-1507003211169-0a1dd7228f2d"),
    timeAgo: "Yesterday",
    location: "Greenhouse District",
    plantId: "snake-plant",
    caption: "A reliable classic for the windowsill. Identified in seconds.",
    likes: 28,
    comments: 1,
  },
];

// --- Forums ----------------------------------------------------------------
export interface ForumCategory {
  id: string;
  title: string;
  blurb: string;
  icon: IconName;
  posts: string;
  accent?: boolean;
}

export const forumCategories: ForumCategory[] = [
  {
    id: "plant-id",
    title: "Plant ID Help",
    blurb: "Stuck on a species? Ask the community to help identify your latest find.",
    icon: "eco",
    posts: "1.2k posts",
  },
  {
    id: "local-trails",
    title: "Local Trails",
    blurb: "Discuss the best hiking spots and what you found along the way.",
    icon: "explore",
    posts: "854 posts",
  },
  {
    id: "rare-finds",
    title: "Rare Finds",
    blurb: "Showcase your legendary and uncommon discoveries here.",
    icon: "star",
    posts: "432 posts",
    accent: true,
  },
  {
    id: "photography",
    title: "Nature Photography",
    blurb: "Tips, tricks, and showcases for capturing the perfect botanical shot.",
    icon: "photo-camera",
    posts: "2.1k posts",
  },
  {
    id: "general",
    title: "General Discussion",
    blurb: "Everything else related to botany, foraging, and the great outdoors.",
    icon: "forum",
    posts: "3.5k posts",
  },
];

export interface ForumComment {
  id: string;
  author: string;
  avatarUrl: string;
  timeAgo: string;
  body: string;
  likes: number;
  isAuthor?: boolean;
  nested?: boolean;
}

export interface ForumThread {
  id: string;
  tag: string;
  author: string;
  avatarUrl: string;
  timeAgo: string;
  title: string;
  body: string;
  imageUrl: string;
  likes: number;
  replies: number;
  comments: ForumComment[];
}

export const forumThread: ForumThread = {
  id: "fern-id",
  tag: "Identification",
  author: "Sarah Explorer",
  avatarUrl: img("photo-1534528741775-53994a69daeb"),
  timeAgo: "2 hours ago",
  title: "Found this strange fern in the Pacific Northwest, any ideas?",
  body: "I was hiking near Mount Rainier this weekend and stumbled upon this unusual fern. The fronds have a very distinct silvery backing that I haven't seen on the typical Sword Ferns around here. The soil was very moist and it was growing in deep shade under some old-growth cedars. Could it be a rare variant or an invasive species I should report?",
  imageUrl: img("photo-1509423350716-97f9360b4e09"),
  likes: 42,
  replies: 12,
  comments: [
    {
      id: "c1",
      author: "BotanistBob",
      avatarUrl: img("photo-1472099645785-5658abf4ff4e"),
      timeAgo: "1 hour ago",
      body: "That looks like a Lady Fern (Athyrium filix-femina) trying its best in a really shaded spot! Sometimes they get that paler underside when they are stretching for light. Great find!",
      likes: 8,
    },
    {
      id: "c2",
      author: "Sarah Explorer",
      avatarUrl: img("photo-1534528741775-53994a69daeb"),
      timeAgo: "45 mins ago",
      body: "Thanks Bob! That makes total sense. I'll update my PlantDex entry.",
      likes: 2,
      isAuthor: true,
      nested: true,
    },
  ],
};

// --- Plant chat ------------------------------------------------------------
export interface ChatMessage {
  id: string;
  from: "plant" | "user";
  text?: string;
  imageUrl?: string;
  time: string;
}

export const chatMessages: ChatMessage[] = [
  {
    id: "m1",
    from: "plant",
    text: "Greetings, traveler. It is quiet here in the deep swamp today. What brings you to seek me out?",
    time: "10:42 AM",
  },
  {
    id: "m2",
    from: "user",
    text: "I was wondering where you usually grow? I'd love to see you in the wild.",
    time: "10:43 AM",
  },
  {
    id: "m3",
    from: "plant",
    text: "Ah, I am elusive. I prefer the humid, shaded embrace of pop ash and pond apple trees, deep within the flooded forests of Florida and Cuba. I cling to their bark, far from the sun's harsh gaze.",
    time: "10:44 AM",
  },
  {
    id: "m4",
    from: "plant",
    imageUrl: img("photo-1448375240586-882707db888b"),
    time: "10:44 AM",
  },
];

export const chatSuggestions = [
  "How can I identify you?",
  "Are you native here?",
  "When do you bloom?",
];

// --- Map markers -----------------------------------------------------------
export interface MapMarker {
  id: string;
  plantId: string;
  top: string;
  left: string;
  rarity: Rarity;
}

export const mapMarkers: MapMarker[] = [
  { id: "mk1", plantId: "monstera", top: "40%", left: "25%", rarity: "COMMON" },
  { id: "mk2", plantId: "pothos", top: "60%", left: "70%", rarity: "COMMON" },
  { id: "mk3", plantId: "snake-plant", top: "25%", left: "60%", rarity: "UNCOMMON" },
  { id: "mk4", plantId: "red-maple", top: "50%", left: "45%", rarity: "RARE" },
];

// --- Profile ---------------------------------------------------------------
export const profile = {
  username: "@NatureExplorer",
  avatarUrl: img("photo-1438761681033-6461ffad8d80"),
  bio: "Collecting the world's flora, one leaf at a time. Explorer level 42. Nature enthusiast.",
  level: 42,
  stats: { points: 1240, species: 87, posts: 142, friends: 34 },
  completionPct: 24,
  dexCount: { discovered: 87, total: 350 },
  regions: [
    { name: "Local Woodlands", discovered: 45, total: 50, rarity: "COMMON" as Rarity },
    { name: "Coastal Biome", discovered: 12, total: 80, rarity: "UNCOMMON" as Rarity },
    { name: "Alpine Ridge", discovered: 0, total: 30, rarity: "RARE" as Rarity },
  ],
};

export const recentDiscoveryIds = ["monstera", "pothos", "ghost-orchid"];

// --- Friends ---------------------------------------------------------------
export interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  species: number;
  mutuals?: number;
}

export const friends: Friend[] = [
  { id: "f1", name: "Alex River", username: "@alexriver", avatarUrl: img("photo-1500648767791-00dcc994a43e"), species: 142, mutuals: 8 },
  { id: "f2", name: "Maya Lin", username: "@mayalin", avatarUrl: img("photo-1438761681033-6461ffad8d80"), species: 98, mutuals: 5 },
  { id: "f3", name: "Sam Okafor", username: "@samokafor", avatarUrl: img("photo-1507003211169-0a1dd7228f2d"), species: 67, mutuals: 12 },
  { id: "f4", name: "Sarah Explorer", username: "@sarahx", avatarUrl: img("photo-1534528741775-53994a69daeb"), species: 211, mutuals: 3 },
];

export const friendRequests: Friend[] = [
  { id: "r1", name: "BotanistBob", username: "@botanistbob", avatarUrl: img("photo-1472099645785-5658abf4ff4e"), species: 320, mutuals: 6 },
  { id: "r2", name: "Jordan Fields", username: "@jfields", avatarUrl: img("photo-1507591064344-4c6ce005b128"), species: 54, mutuals: 2 },
];

export const suggestedFriends: Friend[] = [
  { id: "s1", name: "Priya Nair", username: "@priyanair", avatarUrl: img("photo-1544005313-94ddf0286df2"), species: 176, mutuals: 9 },
  { id: "s2", name: "Tom Hayes", username: "@tomhayes", avatarUrl: img("photo-1506794778202-cad84cf45f1d"), species: 41, mutuals: 1 },
];

// --- Settings --------------------------------------------------------------
export interface SettingRow {
  key: string;
  label: string;
  icon: IconName;
  kind: "toggle" | "link" | "value";
  value?: string;
  on?: boolean;
  destructive?: boolean;
}

export interface SettingSection {
  title: string;
  rows: SettingRow[];
}

export const settingsSections: SettingSection[] = [
  {
    title: "Account",
    rows: [
      { key: "edit", label: "Edit Profile", icon: "person", kind: "link" },
      { key: "email", label: "Email", icon: "mail", kind: "value", value: "explorer@sproutgo.app" },
      { key: "privacy", label: "Default Discovery Privacy", icon: "lock", kind: "value", value: "Public" },
    ],
  },
  {
    title: "Notifications",
    rows: [
      { key: "push", label: "Push Notifications", icon: "notifications", kind: "toggle", on: true },
      { key: "friends", label: "Friend Activity", icon: "group", kind: "toggle", on: true },
      { key: "rare", label: "Rare Finds Nearby", icon: "star", kind: "toggle", on: false },
    ],
  },
  {
    title: "Preferences",
    rows: [
      { key: "units", label: "Distance Units", icon: "straighten", kind: "value", value: "Miles" },
      { key: "location", label: "Location Services", icon: "place", kind: "toggle", on: true },
    ],
  },
  {
    title: "Support",
    rows: [
      { key: "help", label: "Help & FAQ", icon: "help", kind: "link" },
      { key: "about", label: "About SproutGo", icon: "info", kind: "link" },
      { key: "signout", label: "Sign Out", icon: "logout", kind: "link", destructive: true },
    ],
  },
];

// --- Onboarding ------------------------------------------------------------
export interface OnboardingSlide {
  key: string;
  title: string;
  body: string;
  icon: IconName;
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    key: "discover",
    title: "Discover plants around you",
    body: "Explore a living map of plant discoveries from you, your friends, and the community.",
    icon: "map",
  },
  {
    key: "identify",
    title: "Identify plants with AI",
    body: "Point your camera at any plant and let SproutGo identify the species in seconds.",
    icon: "photo-camera",
  },
  {
    key: "collect",
    title: "Build your PlantDex",
    body: "Every discovery unlocks a collectible badge. Earn points and complete your collection.",
    icon: "grid-view",
  },
];

// Legacy capture-flow fixture. The live flow now drives the post-capture branch from
// the real ObservationResult (see identify/processing.tsx); this is retained only as a
// fixture for the mockData referential-integrity tests.
export const identifyResult = {
  plantId: "monstera",
  points: 65,
  confidence: 0.94,
  isFirstDiscovery: true,
};
