# SproutGo — MVP Features

## MVP Flow (Overview)

1. **Explore** — User moves about on a projected, stylized map (main screen).
2. **Capture** — User photographs plants in the field.
3. **Identify** — Photo goes through AI; plant types are detected.
4. **Geotag** — GPS coordinates map the discovery location.
5. **Progress** — User earns points based on rarity and fills out their **PlantDex**.
6. **Collect** — Collection system tracks discoveries, photos, and stats.
7. **Learn** — **Library** provides encyclopedia data for all species.
8. **Social** — User accounts, friends, forum-style chat, photo posts, and likes.
9. **Chat with plants** — Users can converse with plants they like in the PlantDex; the plant responds in character based on species personality.

---

## 1. Projected Map (Main Screen)

The projected map is the **main screen** of the app. The user can move about the world while the map responds around them.

### What the map shows

- User's current location
- Nearby plant discoveries
- Rare plant markers
- Recently discovered plants
- Areas with high plant activity
- User's own discoveries
- Friend discoveries (if allowed)

### Design direction

**Stylized exploration map**

A colorful, game-like map inspired by Pokémon GO rather than Google Maps, with simplified roads, trails, parks, forests, and water features.

**Player-centric navigation**

The user's avatar remains at the center of the screen while the map moves around them as they walk, making exploration feel immersive and active.

**Nature-focused visual markers**

Plant discoveries appear as distinct icons (🌳 trees, 🌸 flowers, 🌿 shrubs, etc.). Rare species use special colors, animations, or glow effects to stand out.

**Social layers on the map**

Friend avatars, friend discoveries, and community sightings appear directly on the map, so users can see where others have explored and what they have found.

**Clean, uncluttered game UI**

Minimal menus, large interactive icons, smooth animations, and a green/nature-themed color palette that keeps the focus on discovery, collection, and exploration.

---

## 2. Plant Photography & AI Identification

This feature is the **primary interaction** between the user and the application. It is the starting point for discovery, identification, mapping, collection, and social sharing.

### User experience

1. The user encounters a plant while exploring.
2. They open the app and tap the camera button.
3. The in-app camera opens (optional guide overlay to help center the plant).
4. The user takes a photo of the plant.
5. The photo is previewed.
6. The user confirms the image and submits it.
7. The image is uploaded for AI analysis.
8. Plant type(s) are detected and linked to the discovery flow (map, points, PlantDex).

### Data captured

When the photo is taken, the application automatically records:

| Field | Notes |
|-------|--------|
| Image | The photo itself |
| User ID | Owner of the capture |
| Timestamp | When the photo was taken |
| GPS coordinates | Discovery location on the map |
| Device orientation | Optional |
| Weather conditions | Optional future feature |

---

## 3. Collection System

The Collection System is the **overarching progression system** that tracks everything a user has discovered. It gives users a sense of accomplishment and encourages continued exploration.

### What it stores

- All discovered plant species
- All submitted photographs
- Discovery dates and locations
- Rare plant finds
- Total points earned
- Milestones and achievements
- Exploration statistics

### Example profile summary

| Stat | Example |
|------|---------|
| Species discovered | 127 |
| Photos submitted | 542 |
| Rare species found | 12 |
| Points earned | 8,430 |
| PlantDex completion | 42% |

The Collection System acts as the user's **personal history** within the app. Every discovery contributes to their growing collection and showcases their progress as a nature explorer.

---

## 4. Library

The Library is the application's **complete encyclopedia of plants**.

Unlike the Collection System (personal), the Library contains information about **every plant species** in the app, whether or not the user has discovered it.

### Each plant page may include

- Common name
- Scientific name
- Species classification
- Description
- Habitat information
- Native or invasive status
- Rarity level
- Identification tips
- Community photographs
- Locations where the species has been observed

---

## 5. PlantDex

The PlantDex is the user's **personal collection** of species they have successfully identified. It functions similarly to a Pokédex in Pokémon.

### First-time discovery

When a user discovers a species for the first time:

- The species is added to their PlantDex
- The user receives bonus points
- A new PlantDex entry is unlocked

### PlantDex contents

- Only plants discovered by that user
- Discovery date
- First discovery photo
- Number of observations
- Species information
- Completion progress

### Example progress

```
PlantDex Progress: 127 / 300 Species Found

Trees:   52
Flowers: 38
Shrubs:  21
Ferns:   16
```

### Chat with your plant

From the PlantDex, users can **chat with a plant** they have collected. The plant adopts a persona aligned with its breed or species — for example gloomy, happy, sad, or fearful — and answers the user's questions in character.

---

## 6. User System, Friends & Social

### User accounts & profiles

Each user has an account and profile storing:

- Username
- Profile picture
- Total points
- PlantDex progress
- Photos posted
- Friends list
- Recent plant discoveries

### Friends

Users can add each other as friends.

**Basic flow**

1. User searches for another user.
2. User sends a friend request.
3. Other user accepts or rejects.
4. Once accepted, they can see each other's profiles, posts, and discoveries.

**Advanced friend features**

- Private friend-only posts
- Friend leaderboards
- Friend discovery maps
- Comparing PlantDex progress
- Seeing recent discoveries from friends

### Photo feed & engagement

Users can:

- Post photos to the community
- Like photos from others

### Forum-style chatting page

The forum is a **community discussion area**, similar to Reddit or Discord channels.

**Example topics**

- Plant ID Help
- Local Trails
- Rare Finds
- Gardening
- Nature Photography
- General Discussion

**Forum post structure**

- Title
- Text
- Optional image
- Comments
- Likes / upvotes
- Timestamp
- Author

---

## Feature map (quick reference)

| Feature | Role |
|---------|------|
| Projected map | Main screen; exploration and discovery visualization |
| Camera + AI | Core capture and species identification |
| GPS / geotagging | Places discoveries on the map |
| Points (rarity) | Rewards exploration and new species |
| Collection system | Personal progress and history |
| Library | Global species encyclopedia |
| PlantDex | Personal species catalog + plant chat |
| Users & friends | Profiles, social graph, friend maps |
| Forum | Community discussion by topic |
| Photo feed | Posts and likes |
