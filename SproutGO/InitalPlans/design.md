# SproutGo Design System and UI Direction

## Purpose

This file defines the visual direction, user interface structure, interaction rules, and screen-level design requirements for SproutGo. It is intended to be used alongside the product prompt and technical feasibility document so that the app is implemented with a consistent, professional interface rather than a loosely assembled or “vibecoded” UI.

SproutGo is a social, geotagged plant-discovery platform where users identify real-world plants with AI, collect species in a PlantDex, earn points for exploration, share discoveries with friends, and interact with AI-powered plant guides.

The UI should communicate four ideas immediately:

1. Nature exploration
2. Personal collection
3. Scientific curiosity
4. Soft game-like reward

The app should feel like a premium collectible nature journal with a clean white-and-green product interface.

---

## 1. Design Direction

SproutGo should not look like a generic map app, generic social app, or random AI wrapper. The interface should feel intentionally designed around plant discovery.

The product should visually sit between:

- A clean consumer mobile app
- A nature field guide
- A light exploration game
- A collectible journal

The app should be primarily white and green. White creates a clean, breathable interface. Green communicates nature, growth, ecology, and exploration. Game-like elements should appear mainly in discovery moments, badges, points, and PlantDex progression.

The overall design ratio should be:

- 80% clean white-and-green product UI
- 20% collectible game reward UI

This means the main app should feel calm and polished, while special moments such as new discoveries, rare plants, first discoveries, and milestone rewards can feel more colorful and animated.

---

## 2. Visual Identity

### 2.1 Core Style Statement

SproutGo’s UI uses a clean white-and-green nature interface combined with collectible plant badges and soft game-like discovery rewards. The main app should feel calm, modern, and polished, while discovery moments should feel rewarding through badges, points, progress bars, rarity colors, and rare plant visuals. The interface should not look like a generic social app or a default map app. It should feel like a premium plant exploration journal where every discovered species becomes part of a visual collection.

### 2.2 Primary Design Qualities

The UI should feel:

- Clean
- Calm
- Structured
- Modern
- Outdoorsy
- Trustworthy
- Slightly game-like
- Rewarding without being chaotic

The UI should not feel:

- Cartoonish
- Overly arcade-like
- Cluttered
- Cheap
- Randomly styled
- Overloaded with gradients
- Like a default template
- Like every screen was designed separately

---

## 3. Color System

The app should use a restrained white-and-green palette with controlled accent colors for rarity and rewards.

### 3.1 Primary Colors

Use these color roles consistently across the app.

Primary Background: Pure White  
Use for most app screens, cards, text-heavy areas, and neutral surfaces.

Secondary Background: Soft Off-White  
Use for grouped sections, subtle page backgrounds, input fields, and inactive content areas.

Primary Green: Forest Green  
Use for main buttons, active navigation, selected states, progress indicators, and positive actions.

Deep Green: Dark Forest  
Use for headings, high-emphasis text, important icons, and premium-feeling accents.

Light Green: Mint Surface  
Use for success states, PlantDex progress areas, light cards, subtle selected states, and calm backgrounds.

Muted Green: Sage Border  
Use for borders, dividers, inactive chips, card outlines, and subtle UI structure.

Discovery Gold: Reward Accent  
Use sparingly for points, first discoveries, milestone achievements, and major reward states.

Warning Red: Error / Destructive  
Use only for failed uploads, failed identification, deletion, reporting, blocked states, and other serious warning contexts.

### 3.2 Rarity Colors

Rarity colors should be consistent. Do not create a new rarity style for every plant.

Recommended rarity system:

Common: Green  
Use for normal discoveries and common species.

Uncommon: Blue-Green  
Use for less common discoveries.

Rare: Purple  
Use for rare species badges and special plant entries.

Legendary / Extremely Rare: Gold  
Use only for extremely rare discoveries, special achievements, or major milestones.

Rarity should never be communicated only through color. Always pair color with a label such as “Common,” “Uncommon,” “Rare,” or “Legendary.”

### 3.3 Color Usage Rules

Do not create one-off colors for individual screens.

Do not use bright neon green.

Do not overuse orange or gold. Gold should feel valuable because it is rare.

Do not use purple except for rare plants or rare reward states.

Do not use heavy gradients across standard UI. Gradients are allowed only for special reward cards, such as “First Discovery.”

---

## 4. Typography

Use a modern sans-serif typeface. For React Native, start with the system font or use Inter if custom fonts are included.

Typography should feel clean and functional. Avoid playful or childish fonts.

### 4.1 Type Roles

Large Title  
Use for main screen titles such as “PlantDex,” “Library,” “Feed,” and “Profile.”

Section Title  
Use for card headers, grouped sections, and bottom sheet titles.

Body Text  
Use for descriptions, plant facts, post captions, and normal content.

Caption Text  
Use for timestamps, confidence scores, location labels, secondary metadata, and helper text.

Badge Text  
Use for rarity labels, plant type tags, native/invasive labels, and status chips.

### 4.2 Typography Rules

Headings should be strong but not oversized.

Plant common names should be visually stronger than scientific names.

Scientific names should usually be smaller, muted, and optionally italicized.

Avoid dense paragraphs on mobile. Break plant information into expandable sections or short blocks.

Important data such as points, confidence, rarity, and discovery status should be presented in compact visual rows or badges.

---

## 5. Shape, Spacing, and Layout

SproutGo should use a rounded, soft, premium mobile interface.

### 5.1 Corner Radius

Cards: 20–24 px  
Buttons: 14–18 px  
Small chips and badges: fully rounded pills  
Bottom sheets: 28 px top radius  
Image cards: 20 px  
Plant badges: hexagonal or shield-like collectible shape  

### 5.2 Spacing System

Use an 8-point spacing system.

Recommended spacing:

4 px: very tight internal spacing  
8 px: close spacing between related elements  
16 px: standard padding inside cards and controls  
24 px: standard screen margin  
32 px: major section separation  
40+ px: hero spacing or major reward screens  

Do not use random margins. Every screen should feel like it follows the same spacing system.

### 5.3 Layout Rules

Screens should feel airy and readable.

Avoid placing too many controls on one screen.

Avoid tiny tap targets.

Use cards to group related content.

Use bottom sheets for map marker details and contextual actions.

Use segmented controls for switching between related content, such as PlantDex and Library.

---

## 6. Badge and Collectible System

The badge system is central to SproutGo’s visual identity. It should make each discovered plant feel collectible.

### 6.1 Plant Badge Concept

Each discovered plant can be represented by a collectible badge. The badge can be a hexagon or shield-like shape with a plant image or illustration inside.

A plant badge should include:

- Plant image or illustration
- Common name
- Rarity color theme
- Optional rarity label
- Optional glow or ring for rare plants
- Consistent border thickness
- Consistent text placement

The badge should feel like an achievement token, not just a thumbnail.

### 6.2 Badge Usage

Use plant badges in:

- PlantDex grid
- New discovery result screen
- Rare plant achievement cards
- Profile badges
- Leaderboard highlights
- First discovery reward screens

### 6.3 Badge States

Discovered State  
The badge shows the plant image, name, and rarity styling.

Locked State  
The badge appears muted or silhouetted. It may show “Undiscovered” and an optional habitat hint.

Rare State  
The badge uses a purple theme, stronger outline, and subtle glow.

Legendary State  
The badge uses a gold theme, stronger reward treatment, and should be used sparingly.

### 6.4 Badge Rules

Do not redesign the badge style for every plant.

Do not use raw emoji as the main badge art.

Do not make all badges overly colorful. The badge color should communicate rarity.

Do not crowd the badge with too much text.

---

## 7. Navigation Structure

Use bottom tab navigation.

Recommended tabs:

1. Map
2. PlantDex
3. Capture
4. Feed
5. Profile

The Capture tab should be centered and visually emphasized.

### 7.1 Tab Responsibilities

Map  
The default home screen. Shows user location, plant discoveries, friend discoveries, and nearby activity.

PlantDex  
Shows the user’s discovered species, progress, locked plants, and access to the full Library.

Capture  
Launches the camera flow.

Feed  
Contains discovery posts, friends feed, community feed, and forums.

Profile  
Contains user stats, friends, settings, posts, and personal discovery history.

### 7.2 Library Placement

The Library should live inside the PlantDex area, not as a separate bottom tab.

Inside PlantDex, use a top toggle:

- My PlantDex
- Library

This keeps the primary navigation focused and avoids overcrowding.

### 7.3 Forum Placement

Forums should live inside Feed.

Inside Feed, use tabs:

- Discoveries
- Friends
- Forums

This keeps all community features grouped together.

---

## 8. Core Screen Specifications

## 8.1 Onboarding

Purpose: Explain the app quickly and ask for required permissions.

Keep onboarding short. Do not use excessive slides.

Recommended screens:

Screen 1: Discover plants around you  
Show a map illustration with green plant markers.

Screen 2: Identify plants with AI  
Show a camera scanning a plant.

Screen 3: Build your PlantDex  
Show a collection grid with discovered and locked badges.

Screen 4: Permissions  
Ask for camera and location access with clear explanations.

Location permission copy:
“SproutGo uses your location to place plant discoveries on your map.”

Camera permission copy:
“SproutGo uses your camera to identify plants and add them to your PlantDex.”

Onboarding style:

- White background
- Green illustration accents
- Clear heading
- Short body copy
- Primary green button
- Minimal decoration

## 8.2 Authentication

Login and signup should be simple and trustworthy.

Layout:

- SproutGo logo or wordmark at top
- Large title
- Short subtitle
- Email and password fields
- Primary green button
- Secondary link for switching between login and signup
- Optional third-party auth buttons if included

Rules:

- Avoid overdesigned auth screens.
- Do not use distracting plant graphics behind form fields.
- Keep error messages clear and specific.

## 8.3 Map Screen

The Map is the main product screen and should feel like a stylized exploration interface.

Layout:

- Full-screen stylized map
- User avatar centered or near-centered
- Plant markers around the user
- Floating search or nearby bar near top
- Layer/filter button
- Recenter-location button
- Bottom tab navigation
- Capture tab emphasized

Map controls should appear as floating white cards with soft shadows.

### Marker Types

Common plant marker  
Green marker with simple plant icon.

Uncommon plant marker  
Blue-green marker.

Rare plant marker  
Purple or green marker with gold or purple ring and subtle pulse.

User’s own discovery  
Marker with a white outline or small profile indicator.

Friend discovery  
Small avatar marker with plant indicator.

Recent discovery  
Marker with subtle pulsing animation.

Community discovery  
Standard public marker, lower priority than friend or rare markers.

### Marker Bottom Sheet

When a marker is tapped, a bottom sheet slides up.

Bottom sheet content:

- Plant image
- Common name
- Scientific name
- Rarity badge
- Distance from user
- Who discovered it
- Time discovered
- General location
- View Plant button
- View Nearby button or map action

The map should not display too much text directly over the map. Details belong in bottom sheets.

### Map Rules

Show only important markers at default zoom.

Cluster markers when zoomed out.

Use rarity rings rather than too many marker colors.

Keep map labels minimal.

Older discoveries should visually recede.

User avatar is highest priority.

Rare plants are second priority.

Friend discoveries are third priority.

Common plant markers are lower priority.

## 8.4 Camera Screen

The Camera screen should be one of the most polished flows in the app.

Layout:

- Full-screen camera preview
- Close button in top-left
- Optional flash button
- Daily quota or capture count if needed
- Center framing guide
- Short instruction bubble near bottom
- Large green capture button
- Small gallery upload button if allowed
- Optional retake/history button

Instruction examples:

“Center your plant.”  
“Capture leaves or flowers clearly.”  
“Pinch to zoom.”  
“Move closer for better identification.”

Rules:

- Keep camera UI minimal.
- Do not ask for caption before identification.
- Do not block the camera with too much text.
- The capture button should be unmistakable.

## 8.5 Photo Preview

After capture, show a preview screen.

Content:

- Large photo preview
- Retake button
- Use Photo button
- Optional small guidance note

Rules:

- Keep this step fast.
- The primary action should be “Use Photo.”
- Caption and sharing should happen after AI identification, not before.

## 8.6 AI Processing

The AI processing screen should feel polished and calm.

Layout:

- White or blurred-photo background
- Photo preview card
- Animated green scan line or circular progress indicator
- Short status message

Suggested status sequence:

“Analyzing plant structure…”  
“Checking possible species…”  
“Preparing your discovery…”

Rules:

- Avoid fake technical language.
- Avoid overly long loading copy.
- Use the plant photo so the user feels continuity from camera to result.

## 8.7 Identification Result

This is a key reward screen. It should feel like both an achievement and an educational result.

Recommended layout:

- Blurred or darkened plant photo background at top
- White result card over photo
- Large plant badge overlapping the top of the card
- “Congrats, you discovered” message
- Points pill
- Common name
- Scientific name
- Family if available
- Confidence score
- Rarity badge
- “About This Plant” section
- Primary action: View PlantDex Entry
- Secondary action: Share Discovery
- Tertiary action: Ask This Plant

For new discoveries, show:

- “New Plant Found”
- Points earned
- PlantDex unlocked status
- Location saved status

For low-confidence results, show:

“Possible Match”
“AI confidence is low. You can still save this discovery, but it will be marked as uncertain.”

Rules:

- Do not overstate certainty.
- Confidence should be visible.
- The next action should be obvious.
- The result should feel rewarding but not cluttered.

## 8.8 First Discovery Modal

The First Discovery screen should be a special reward state, not a normal result state.

Use it when:

- The user finds a species for the first time
- The user is first in the area or community to find that species
- The plant is rare
- The user completes a milestone

Design:

- Gold or orange reward card
- “First Discovery” heading
- Plant name
- Bonus points
- Share Discovery button
- Continue button

Rules:

- Do not show this for every plant.
- Do not overuse confetti.
- Make it feel valuable by using it sparingly.

## 8.9 PlantDex

The PlantDex is the user’s personal collection. It should be visually satisfying and collectible.

Top section:

- Title: PlantDex
- Subtitle: number of plants discovered
- Points chip
- Level, streak, or badge chip

Progress card:

- User rank/title, such as “Master Naturalist”
- Current points
- Progress to next level
- Progress bar
- Completion percentage

Controls:

- Sort
- Filter
- Search

Plant grid:

- 2 or 3 columns
- Hexagon plant badges
- Common name inside or below badge
- Rarity color border
- Locked state for undiscovered species

PlantDex stats:

- Species discovered
- Rare species found
- Total points
- Photos submitted
- Completion percentage

Rules:

- This should be one of the best-looking screens.
- Keep the grid visually consistent.
- Locked plants should create curiosity, not clutter.
- Use progress and badges to make collection feel meaningful.

## 8.10 Library

The Library is the full plant encyclopedia.

It should feel informational, searchable, and clean.

Top section:

- Search bar
- Filter by plant type
- Filter by rarity
- Filter by native/invasive status
- Sort by name, rarity, nearby sightings, or discovered status

Plant list item:

- Thumbnail image
- Common name
- Scientific name
- Type badge
- Native/invasive badge
- Discovered indicator

Rules:

- Clearly distinguish Library from PlantDex.
- Library contains all plants.
- PlantDex contains plants discovered by the user.
- Discovered plants can have a green checkmark.
- Undiscovered plants can have a muted outline state.

## 8.11 Plant Detail

The Plant Detail screen is shared by Library and PlantDex.

Header:

- Large plant image
- Common name
- Scientific name
- Rarity badge
- Discovered or undiscovered status

Main sections:

- Overview
- How to identify
- Habitat
- Native status
- Rarity
- User discovery history
- Community photos
- Map sightings
- Chat with plant

The “Chat with Plant” button should be visible but not gimmicky.

Recommended labels:

“Ask this plant”  
“Chat with this plant”

Rules:

- Use expandable cards for long information.
- Keep facts scannable.
- Do not make this screen feel like a dense encyclopedia page.
- Community photos should use clean image cards.

## 8.12 Plant Chat

The Plant Chat screen should feel like a conversation with a plant guide, not a generic chatbot.

Header:

- Plant image avatar
- Common name
- Scientific name
- Optional personality label

Example personality label:
“Calm woodland guide”

Chat layout:

- White background
- Plant messages aligned left
- User messages aligned right
- Plant messages in light green bubbles
- User messages in dark green bubbles
- Suggested questions at bottom
- Text input fixed at bottom

Suggested questions:

- “Where do you grow?”
- “How can I identify you?”
- “Are you native here?”
- “What animals use you?”
- “When do you flower?”

Rules:

- The chat should stay grounded in plant facts.
- If the AI is uncertain, it should say so.
- The plant can have personality, but should not invent facts.
- Suggested questions should reduce friction for first-time users.

## 8.13 Feed

The Feed shows plant discovery posts and community activity.

The feed should feel like a nature discovery journal, not a generic social feed.

Post card layout:

- User avatar
- Username
- Timestamp
- Plant photo
- Plant name
- Scientific name if space allows
- Rarity badge
- Caption
- General location
- Like/comment row
- View Plant button

A post should quickly answer:

- Who found this?
- What plant is it?
- Where was it generally found?
- How rare is it?
- Can I view the plant page?

Feed tabs:

- Friends
- Community
- Forums

Rules:

- Do not hide plant identity inside the caption.
- Plant name should be attached to the post.
- Use clean cards with strong image treatment.
- Avoid chaotic comment previews.

## 8.14 Forum

The Forum should be structured, not a chaotic chat page.

Categories:

- Plant ID Help
- Local Trails
- Rare Finds
- Nature Photography
- General Discussion

Forum post card:

- Title
- Category
- Author
- Short preview
- Comment count
- Time posted
- Optional image thumbnail

Thread screen:

- Original post at top
- Comments below
- Reply input at bottom
- Like or upvote action
- Report option

Rules:

- Titles should be readable.
- Metadata should be muted.
- Use compact cards.
- Forum should feel organized and useful.

## 8.15 Profile

Profile should make users feel proud of their exploration history.

Top section:

- Profile photo
- Username
- Bio
- Add Friend or Edit Profile button
- Points
- Species discovered
- Posts
- Friends

Main sections:

- Recent discoveries
- PlantDex progress
- Posts
- Friends
- Settings

Rules:

- Profile should emphasize discovery and progress.
- Do not make it only a social profile.
- Discovery stats should be visually prominent.

## 8.16 Friends

Friends should be simple for MVP.

Required screens:

- Search users
- Incoming friend requests
- Friends list
- Friend profile

Friend profile content:

- Public profile info
- PlantDex progress
- Recent discoveries
- Public or friend-only posts
- Optional discovery map

Rules:

- Do not build live friend tracking unless privacy is fully handled.
- Friend discoveries are safer and more relevant than live friend location.
- Friends should support exploration, not become a separate chat app.

---

## 9. Component System

The UI should be built from reusable components. Do not build every screen from scratch.

### 9.1 Buttons

Primary Button  
Use for main actions such as Use Photo, View PlantDex Entry, Share Discovery, and Continue.

Secondary Button  
Use for secondary actions such as Retake, View Plant, or Edit Profile.

Ghost Button  
Use for low-emphasis actions.

Icon Button  
Use for map controls, filter buttons, close buttons, flash, and recenter.

Destructive Button  
Use for delete, report, block, or remove friend.

### 9.2 Cards

Plant Card  
Used in Library and list views.

Plant Badge Card  
Used in PlantDex grid and reward states.

Post Card  
Used in Feed and profile posts.

Stat Card  
Used in Profile and PlantDex progress areas.

Discovery Result Card  
Used after AI identification.

Forum Thread Card  
Used in forum lists.

Profile Summary Card  
Used for user and friend summaries.

### 9.3 Badges and Chips

Rarity Badge  
Shows Common, Uncommon, Rare, or Legendary.

Native Status Badge  
Shows Native, Introduced, or Invasive.

Confidence Badge  
Shows AI confidence percentage.

Plant Type Badge  
Shows Tree, Flower, Shrub, Fern, Grass, etc.

New Discovery Badge  
Shows when the user finds a plant for the first time.

Privacy Badge  
Shows Public, Friends-only, or Private.

### 9.4 Inputs

Search Input  
Used in Library, PlantDex, Feed, and Friends.

Text Field  
Used in auth and profile editing.

Caption Input  
Used when posting a discovery.

Comment Input  
Used in feed and forum threads.

Chat Input  
Used in Plant Chat.

### 9.5 Feedback Components

Loading Skeleton  
Use while images, posts, and plant cards load.

Empty State  
Use when a section has no data.

Error State  
Use when upload, AI, network, or auth fails.

Success Toast  
Use for small confirmations.

Confirmation Modal  
Use for destructive actions or major confirmations.

Bottom Sheet  
Use for map markers and contextual content.

---

## 10. Motion and Interaction

Motion should be subtle and purposeful.

Use animation for:

- New discovery reveal
- Points count-up
- PlantDex unlock
- Rare marker pulse
- Bottom sheet transitions
- Loading scan effect
- Button press feedback

Avoid excessive animation.

### 10.1 Key Animations

New Discovery  
Photo card transitions into result card.

PlantDex Unlock  
Locked badge softly flips or fades into discovered badge.

Rare Marker Pulse  
Rare map marker has a slow, subtle pulse.

Points Earned  
Points count up from 0 to earned amount.

Bottom Sheet  
Slides up smoothly from bottom with slight easing.

### 10.2 Animation Rules

Do not animate everything.

Do not add motion unless it clarifies state or rewards user progress.

Do not use fast or distracting animations.

Do not use confetti except for major milestones.

---

## 11. Empty States

Empty states should guide the user toward action.

PlantDex Empty  
Text: “You have not discovered any plants yet.”  
Action: “Take your first photo”

Feed Empty  
Text: “No posts yet.”  
Action: “Share a discovery”

Friends Empty  
Text: “No friends added yet.”  
Action: “Find friends”

Library No Results  
Text: “No plants found.”  
Suggestion: “Try searching by common name or plant type.”

Map No Discoveries Nearby  
Text: “No nearby discoveries yet.”  
Suggestion: “Be the first to document this area.”

Forum Empty  
Text: “No discussions yet.”  
Action: “Start a discussion”

Plant Chat Empty  
Text: “Ask a question to learn more about this plant.”  
Suggested question chips should appear.

---

## 12. Error and Uncertain States

The app should handle failure clearly and calmly.

AI Identification Failed  
Text: “We could not identify this plant from the photo.”  
Actions: Retake Photo, Save as Unknown, Try Again

Low Confidence  
Text: “Possible match.”  
Show confidence score and allow the user to save as uncertain.

No Location Permission  
Text: “Location is off.”  
Explain that map discoveries need location access. Allow identification without map posting.

Image Upload Failed  
Text: “Photo upload failed.”  
Actions: Retry, Cancel

No Internet  
Text: “You are offline.”  
Allow limited browsing of cached PlantDex if possible.

Post Failed  
Text: “Post could not be shared.”  
Action: Try Again

Chat Failed  
Text: “The plant could not respond right now.”  
Action: Retry

---

## 13. Accessibility Requirements

Accessibility should be included from the start.

Requirements:

- Text must have strong contrast.
- Buttons must be large enough to tap.
- Rarity must not rely only on color.
- Use labels with icons where needed.
- Support dynamic text sizes where possible.
- Avoid tiny metadata text.
- Map markers must have sufficient tap area.
- Loading states must include text, not just animation.
- Important actions must be reachable with one hand.
- Destructive actions must require confirmation.

Green should not be the only indicator of success. Use text labels, icons, and badges.

---

## 14. Developer Design Rules

These rules should prevent inconsistent UI.

Do not create one-off colors.

Do not create one-off button styles.

Do not use random margins.

Do not mix icon styles.

Do not use different card radii on every screen.

Do not use raw emoji as primary UI icons.

Do not place text directly over photos without readable contrast.

Do not make every green a different shade.

Do not add animations unless they support user understanding.

Do not build screens without loading, empty, and error states.

Do not make the app look like a default map app.

Do not make the social feed look like a generic Instagram clone.

Every new screen should reuse existing components first.

---

## 15. MVP Screen List

The MVP should include:

- Onboarding
- Login
- Signup
- Permission request
- Map
- Camera
- Photo preview
- AI processing
- Identification result
- First discovery modal
- PlantDex
- Library
- Plant detail
- Plant chat
- Feed
- Forum categories
- Forum thread
- Create post
- Profile
- Edit profile
- Friends list
- Friend requests
- Settings

This is a large screen set. Implementation should be phased.

---

## 16. UI Build Phases

### Phase 1: Core Shell

Build:

- App navigation
- Auth screens
- Bottom tab bar
- Shared design system
- Basic profile shell

Goal: Make the app feel coherent before building complex features.

### Phase 2: Map and Camera

Build:

- Map screen
- User location
- Plant markers
- Camera capture
- Photo preview
- AI processing state
- Identification result screen

Goal: Complete the core discovery loop.

### Phase 3: PlantDex and Library

Build:

- PlantDex progress
- Badge grid
- Locked and discovered states
- Library search
- Plant detail page

Goal: Make discovery feel collectible and educational.

### Phase 4: Social Layer

Build:

- Feed
- Post cards
- Likes
- Comments
- Forum categories
- Forum threads
- Friends list

Goal: Add community without disrupting the core exploration loop.

### Phase 5: Plant Chat

Build:

- Plant chat entry point
- Chat screen
- Suggested questions
- AI response bubbles
- Optional chat history

Goal: Add differentiated AI personality after plant data screens are stable.

---

## 17. Implementation Priorities

The app should prioritize the following user flow first:

1. Open app
2. View map
3. Capture plant
4. Process with AI
5. Show identification result
6. Add to PlantDex
7. View PlantDex badge
8. Optionally post discovery

This core loop must feel polished before the team adds more complex social features.

The highest-priority screens for visual polish are:

1. Map
2. Camera
3. Identification Result
4. PlantDex
5. Plant Detail

If those five screens are well-designed, the MVP will feel significantly more professional.

---

## 18. Final Product Feel

SproutGo should make the user think:

“I can go outside, discover something, learn what it is, collect it, share it, and come back later to keep exploring.”

The final app should feel like:

- A polished nature app
- A personal plant collection
- A map-based exploration tool
- A lightweight social network
- A friendly educational guide
- A premium collectible plant journal

It should not feel like:

- A default map app
- A generic Instagram clone
- A messy forum
- A cartoon game
- A random AI wrapper
- A collection of disconnected screens
- A loosely styled prototype