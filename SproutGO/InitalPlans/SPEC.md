# SproutGo Product & Technical Specification

## Overview

SproutGo is a nature exploration app that targets young individuals who are interested in plants.

> A social, geotagged plant-discovery platform where users identify real-world plants with AI, collect species in a PlantDex, earn points for exploration, share discoveries with friends, and interact with both the community and AI-powered plant guides.

This document defines the product features, technical feasibility, data models, and the MVP tech stack. It is intended to be used alongside `design.md`, which defines the visual direction and UI specifications.

---

## MVP Flow

1. Projected map where the user can move about.
2. The user photographs pictures of plants.
3. The image goes through an AI.
4. The AI detects the type of plant.
5. GPS coordinates are used to map out the location.
6. The user earns points based on rarity and fills out their PlantDex.
7. Collection system: Library and PlantDex.
8. User system with friends and a forum-style chatting page.
9. Users can post photos and like photos.
10. Users can chat with the plant they like and ask it questions.

---

## 1. Projected Map Where the User Can Move About

The projected map serves as the primary interface of the application. The feature will be implemented using a mapping framework such as Mapbox, the Google Maps SDK, or OpenStreetMap. These services provide map tiles, terrain information, roads, trails, parks, and water features that can be rendered within a mobile application.

The user's location will be tracked using the device's GPS through the mobile operating system's location services. When permission is granted, the application will continuously receive latitude and longitude coordinates and update the user's position on the map in real time. Similar to Pokémon GO, the user's avatar will remain centered on the screen while the map moves around them as they physically walk.

Plant observations will be stored in a backend database with associated GPS coordinates. Each observation record will contain the plant species, image, location, timestamp, rarity level, and user information. When the map loads, the application will request nearby observations from the backend based on the user's current location and render them as markers on the map.

Different marker types will be used to distinguish between observation categories. Common plants may use standard icons, while rare species may be highlighted through distinct colors, animations, or visual effects. Friend discoveries and community discoveries can be displayed as separate layers that users may enable or disable.

To maintain performance, the application will not load every observation globally. Instead, it will use geospatial queries to retrieve only observations within the currently visible map area or within a specified radius of the user. As the user moves or zooms, additional observations are requested from the backend and displayed dynamically.

The visual appearance of the map will be customized to create a game-like exploration experience. Rather than using the default appearance of Google Maps, custom styling will be applied to roads, trails, forests, parks, and bodies of water. This creates a cleaner and more immersive interface that encourages exploration and aligns with the application's nature-focused theme.

The technical complexity of this feature is considered moderate. The required technologies already exist and are widely used in mobile development. The primary implementation tasks involve GPS integration, map rendering, geospatial database queries, marker management, and real-time location updates. As a result, this feature is highly feasible for an MVP and can be implemented using established mapping and geolocation technologies.

---

## 2. The User Photographs Pictures of Plants

This feature is technically feasible using standard mobile camera APIs and cloud image storage. It acts as one of the core input mechanisms of the application, allowing users to create plant observations that can later be identified, geotagged, mapped, added to the PlantDex, and shared socially. In the feature flow, the user opens the app, taps the camera button, photographs a plant, previews the image, and submits it for analysis.

The feature would be implemented through the mobile device's native camera system. If the app is built with React Native, Flutter, Swift, or Kotlin, it can access the device camera through existing camera libraries or platform APIs. The application would request camera permission from the user, open an in-app camera interface, capture the image, and temporarily store it on the device before upload.

After the user takes a photo, the app should show a preview screen. This allows the user to confirm the image, retake the photo, or cancel the submission. This step is important because plant identification depends heavily on image quality. A blurry, dark, or poorly framed image could produce inaccurate AI results. The preview screen may also include simple guidance such as "make sure the leaves or flowers are visible" or "move closer to the plant."

When the image is confirmed, the app uploads it to cloud storage. A service such as Firebase Storage, AWS S3, or Supabase Storage could be used to store the image file. The database would not directly store the image itself. Instead, it would store a reference to the image, such as an image URL or storage path.

At the same time, the application would create an observation record in the backend database. This record connects the photo to the user who submitted it and stores important metadata. A basic observation record could include:

- `observation_id`
- `user_id`
- `image_url`
- `timestamp`
- `latitude`
- `longitude`
- `identification_status`
- `privacy_setting`

The location data would be captured at the time the photo is taken or submitted. This allows the app to connect the image to the map feature. The app would use the phone's GPS system to record latitude and longitude, assuming the user has granted location permission. If location permission is denied, the app could still allow the user to identify the plant, but the observation would not appear on the public map.

Once the image and metadata are stored, the backend can send the image to the AI plant-identification system. The image becomes the input for the next technical step: detecting the plant species. Until identification completes, the observation can be marked as "pending." After the AI returns a result, the database record can be updated with the detected plant species, confidence score, rarity value, and PlantDex status.

This feature also connects to the social system. After the plant is identified, the user can choose whether to post the photo publicly, keep it private, or share it with friends. The same uploaded image can therefore support multiple parts of the app: the map, PlantDex, user collection, profile page, and community feed.

The technical complexity of this feature is low to moderate. Camera capture, image upload, and metadata storage are common mobile app functions. The more challenging part is ensuring that the image is high enough quality for AI identification and that GPS metadata is captured reliably. Overall, this feature is very feasible for an MVP because it can be built using established mobile camera libraries, cloud storage, and backend database systems.

---

## 3. Collection System: Library

The Collection System and Library should be implemented using a structured database model.

The **Library** is the app's master plant database. It contains all plant species that the application recognizes and displays to users.

The **Collection System** is user-specific. It tracks which plants each individual user has discovered, how many photos they have submitted, how many rare species they have found, and how much progress they have made in their PlantDex.

The Library and Collection System work together. The Library stores the plant information globally, while the Collection System tracks each user's personal discoveries.

### 3.1 Library Indexing

The Library should be pre-populated before users begin using the app. This means the app should already have a set of plant entries available when it launches.

Plant data can be imported from an external open-source dataset in CSV or JSON format. Each entry in the dataset should represent one plant species.

Each plant entry should include the following information:

- Scientific name
- Common name
- Family
- Genus
- Plant type
- Description
- Habitat
- Native status
- Rarity level
- Image URL

For example, one plant entry could represent Red Maple. Its scientific name would be *Acer rubrum*. Its common name would be Red Maple. Its family would be Sapindaceae. Its genus would be Acer. Its plant type would be Tree. Its description would explain that it is a native deciduous tree common in eastern North America. Its habitat could include wetlands, forests, and urban areas. Its native status would be Native. Its rarity level would be Common. Its image URL would point to the image used for the plant page.

When the dataset is imported into the app, each plant entry should be inserted into the Plants table. This process is called database seeding.

### 3.2 The Plants Table

The Plants table stores the master version of each plant species in the app. Each plant should have a unique plant ID. The plant ID is important because other parts of the app use it to connect observations, PlantDex entries, user collections, and plant chat features to the correct plant.

The Plants table should include:

- Plant ID
- Scientific name
- Common name
- Family
- Genus
- Plant type
- Description
- Habitat
- Native status
- Rarity level
- Image URL

The most important field is the scientific name. The scientific name should be used as the main identifier when matching AI identification results to the Library. This is because common names can vary by region, while scientific names are more standardized.

### 3.3 How Plants Are Indexed

After the Library is loaded into the database, the app should create indexes on important searchable fields. Indexes make searches faster. They allow the app to quickly find plants when users search the Library or when the backend tries to match an AI result to an existing plant entry.

The app should create indexes for:

- Scientific name
- Common name
- Plant type
- Rarity level
- Native status

These indexes would allow the app to quickly handle searches such as: find Red Maple, show all trees, show rare plants, show native species, and show all flowers.

The app can also use full-text search for better search functionality. Full-text search would allow users to search using partial names, keywords, or descriptions. For example, if a user searches for "maple," the app should be able to return Red Maple, Sugar Maple, and Silver Maple.

### 3.4 How AI Results Connect to the Library

When a user photographs a plant, the image is sent to the AI identification system. The AI system should return a predicted plant species. The result should include the scientific name, common name, and confidence score. For example, the AI might return *Acer rubrum* as the scientific name, Red Maple as the common name, and a confidence score of 92 percent.

After the AI returns a result, the backend should search the Library for a matching plant entry, primarily searching by scientific name. If the backend finds a matching plant in the Library, the user's observation should be linked to that existing plant entry.

The observation should not create a new plant page every time. Instead, the observation should connect to the existing Library entry using the plant ID.

The flow should work like this:

1. The user takes a photo of a plant.
2. The AI identifies the plant.
3. The backend receives the scientific name from the AI result.
4. The backend searches the Library for that scientific name.
5. If a match is found, the observation is linked to the matching plant ID.
6. The user's Collection System and PlantDex are updated.

This keeps the Library clean and prevents duplicate plant pages.

### 3.5 Observation Storage

Every time a user discovers a plant, the app should create an observation record. An observation represents one specific plant discovery made by one user at one time and location.

Each observation should store:

- Observation ID
- User ID
- Plant ID
- Image path
- Latitude
- Longitude
- Timestamp
- Confidence score
- Privacy setting

The plant ID connects the observation to the global Library. The user ID connects the observation to the individual user's Collection System. The image path connects the observation to the plant photo stored in Supabase Storage or another storage system. The latitude and longitude connect the observation to the map. The timestamp records when the plant was discovered. The confidence score stores how certain the AI was about the identification. The privacy setting controls whether the observation is public, friends-only, or private.

One Library entry can have many observations. For example, the Library may contain one Red Maple entry, but many users can submit different Red Maple observations from different places and times.

### 3.6 Collection System

The Collection System tracks everything a user has personally discovered. It is built from the user's observations.

A user's collection should be able to show:

- Number of species discovered
- Number of photos submitted
- Number of rare species found
- Total points earned
- PlantDex completion percentage

The app can calculate these statistics by querying the Observations table and the UserPlants table.

The UserPlants table tracks whether a user has discovered a plant species before. It should include:

- User ID
- Plant ID
- First discovered date
- First observation ID
- Number of times observed

When a user identifies a plant, the backend should check whether that user has already discovered that plant before.

If the user has **not** discovered the plant before, the app should:

- Add the plant to the user's PlantDex
- Give the user first-discovery bonus points
- Create a new UserPlants record
- Mark the plant as newly discovered for that user

If the user **has** already discovered the plant before, the app should:

- Update the number of times the user has observed that plant
- Give reduced duplicate points if the points system allows it
- Avoid creating a duplicate PlantDex entry

This keeps the PlantDex focused on unique species discoveries while still allowing users to photograph the same plant species multiple times.

### 3.7 Difference Between Library and PlantDex

The **Library** is global. It contains every plant species available in the app.

The **PlantDex** is personal. It contains only the plants that a specific user has discovered.

For example, the Library may contain 300 total plant species. One user may have discovered 72 of those species in their PlantDex. Another user may have discovered 118 of those species in their PlantDex.

The Library starts as a pre-filled database. The user's PlantDex starts mostly empty and grows as they use the app. This means users are not completing the Library. They are completing their own PlantDex using the plants available in the Library.

### 3.8 What Happens If the AI Finds a Plant Not in the Library

If the AI returns a plant that does not already exist in the Library, the app should automatically create a new Library entry for that plant. This reduces friction for the MVP because the app does not need an admin review process or a separate unmatched-observations system. Instead, the AI result is immediately used to expand the Library.

When this happens, the app should create a new plant entry using the information returned by the AI system. The new Library entry should store:

- Plant ID
- Predicted scientific name
- Predicted common name
- Confidence score
- Image path
- Date added
- Source of identification
- Basic description, if available

The user's observation should then be linked to the newly created Library entry. This allows the plant to immediately appear in the user's PlantDex, map observations, and plant detail pages.

For the MVP, this approach is faster and simpler to implement. The main tradeoff is that some Library entries may be incorrect, duplicated, or incomplete if the AI result is wrong. To reduce this issue, the app can require a minimum confidence score before creating a new Library entry. For example, if the AI confidence is above 85%, the app creates the entry automatically. If the confidence is lower, the app can still save the observation but label it as uncertain. This keeps the app flow simple while still preventing the lowest-confidence results from polluting the Library too much.

For the MVP, the better approach is to limit the app to a fixed region, such as New Jersey or the northeastern United States. This makes the Library smaller, improves matching accuracy, and reduces the number of missing plant entries.

### 3.9 Implementation Summary

The Library can be created by importing a seed CSV file containing plant data. The PlantDex can be built using standard relational database tables that track which plants each user has discovered. Supabase is a strong fit for this feature because it provides PostgreSQL, authentication, file storage, and database querying in one backend platform.

The main technical tasks are:

- Create the Plants table
- Import plant data from a CSV file
- Index scientific names and common names
- Connect AI identification results to Library entries
- Store user observations
- Track each user's discovered species in their PlantDex
- Calculate PlantDex completion
- Calculate PlantDex statistics
- Handle unmatched AI results safely

The Library provides the app's plant knowledge base. The PlantDex turns that knowledge base into a personalized progression system for each user.

### 3.10 CSV Data Sources

- **USDA PLANTS** — Best for U.S. plant names and taxonomy. It has a downloadable complete checklist.
- **Wikimedia Commons / Wikidata** — Best for open-license images. Use it to get one representative image per scientific name.

---

## 4. User System, Friends, Forum, Photo Posts, and Likes

This feature is technically feasible for an MVP because it is mostly built from standard social-app functionality: user accounts, profiles, friend relationships, posts, comments, and likes. These systems do not require unusual algorithms or advanced AI. They can be implemented with a backend database, authentication system, file storage, and basic frontend screens. This supports the feature goal of letting users create accounts, add friends, post plant photos, and interact through a forum-style page.

### 4.1 User System

The user system would be built using an authentication service such as Supabase Auth, Firebase Auth, or a custom login system. Supabase would be a strong option because it already supports user authentication, PostgreSQL database tables, file storage, and permission rules in one platform.

Each user would have an account and profile. The authentication system would handle login, signup, password reset, and session management. The database would store profile information connected to that authenticated user.

Each user profile should store:

- User ID
- Username
- Profile picture
- Bio
- Total points
- PlantDex progress
- Number of photos posted
- Recent discoveries
- Account creation date

The user ID is the most important part because it connects everything else in the app. Every photo, plant discovery, forum post, like, comment, and friend request should be linked back to a specific user ID. The main challenge is making sure users can only edit their own profile and cannot access private data from other users.

### 4.2 Friends System

The friends system would allow users to connect with each other. This can be implemented using a database table that tracks friend requests and accepted friendships.

The basic flow would be:

1. A user searches for another user by username.
2. The user sends a friend request.
3. The other user receives the request.
4. The other user accepts or rejects it.
5. If accepted, both users become friends.

A friendship record should store:

- Request ID
- Sender user ID
- Receiver user ID
- Status: pending, accepted, rejected, or blocked
- Date created
- Date accepted

Once two users are friends, the app can allow them to view each other's profiles, public discoveries, friend-only posts, and PlantDex progress.

For the MVP, the friends system should stay simple. It only needs friend search, friend requests, accept/reject buttons, and a friends list. More advanced features like friend leaderboards, private friend maps, and PlantDex comparison can be added later. This feature is technically feasible because it is a standard relational database relationship between users.

### 4.3 Forum-Style Chatting Page

The forum-style chatting page would work like a simplified Reddit or Discord community board. Users can create discussion posts, comment on posts, and interact with other users.

The forum could have categories such as: Plant ID Help, Local Trails, Rare Finds, Gardening, Nature Photography, and General Discussion.

Each forum post should store:

- Post ID
- Author user ID
- Title
- Body text
- Optional image path
- Category
- Timestamp
- Like count
- Comment count

Each comment should store:

- Comment ID
- Post ID
- Author user ID
- Comment text
- Timestamp

The frontend would display forum posts in a feed. Users could tap on a post to open the full discussion thread and read or add comments.

This feature is feasible because it is mostly database CRUD functionality: create, read, update, and delete. The main technical concern is moderation. Since users can post text and images, the app should eventually include reporting, deletion, and basic content moderation tools. For an MVP, a simple "report post" feature and admin delete ability would be enough.

### 4.4 Photo Posting

Photo posting connects directly to the plant discovery flow. After a user photographs a plant and the AI identifies it, the app can ask whether the user wants to post the photo. The posted photo will be linked to the PlantDex.

A photo post should store:

- Post ID
- User ID
- Observation ID
- Plant ID
- Image path
- Caption
- General location
- Timestamp
- Visibility setting: public, friends-only, or private
- Like count
- Comment count

The image itself would be stored in Supabase Storage or another cloud storage system. The database would store the image path, not the raw image file.

Photo posts can appear in several places: global feed, friends feed, user profile, and plant species page.

This is feasible because the app already stores plant photos for AI identification. The social posting feature can reuse the same stored image instead of uploading a second copy.

### 4.5 Likes

The like system is simple to implement. Each like is a database record connecting one user to one post.

A like record should store:

- Like ID
- User ID
- Post ID
- Timestamp

The app should prevent a user from liking the same post multiple times. This can be handled by enforcing a rule that each user can only have one like per post.

The user experience is straightforward: the user taps the like button, the app creates a like record, the post's like count increases. If the user taps again, the like is removed and the post's like count decreases. This feature is highly feasible because likes are one of the simplest social interactions to store and display.

### 4.6 How These Systems Work Together

The full social flow would work like this: A user creates an account and profile. They photograph a plant and the app identifies it. The user chooses to post the photo publicly or to friends. The post appears in a feed. Other users can like the post, comment on it, or visit the user's profile. Friends can see each other's discoveries and interact through friend-based feeds or forum discussions. This turns the app from a solo plant-identification tool into a community platform.

The main technical tasks are: set up user authentication; create user profile records; build friend request and friendship tables; build forum post and comment tables; store photo posts linked to plant observations; store likes linked to users and posts; add privacy settings for public, friends-only, and private posts; add basic moderation tools for reported content; and build frontend screens for profiles, friends, feeds, and forums.

---

## 5. Chat With the Plant: Users Can Ask It Questions

This feature allows users to open a plant from their PlantDex or Library and ask it questions through an AI chatbot. In the app experience, the plant would act like a character or guide based on its species information. For example, if the user opens Red Maple, they could ask questions about where it grows, how to identify it, whether it is native, what animals interact with it, or what conditions it needs to survive. This supports the feature goal of letting users "chat with the plant" after discovering it.

This feature is technically feasible using a large language model API. The app would not need to train its own chatbot model. Instead, the backend would send the user's question, the plant's database information, and a system instruction to an LLM. The model would then generate a response as if the plant were answering the user.

The most important part is grounding the chatbot in the Library data. When a user opens a plant chat, the backend should first retrieve that plant's Library entry. This entry may include the scientific name, common name, description, habitat, native status, rarity level, identification tips, and image. The app then passes this plant information into the AI prompt so the response is based on known plant facts rather than random generation.

The flow would work like this:

1. User opens a plant page from the PlantDex or Library.
2. User taps "Chat with Plant."
3. User asks a question.
4. The backend retrieves that plant's data from the Library.
5. The backend sends the plant data and user question to the AI model.
6. The AI generates a response in the voice/personality of that plant.
7. The response is displayed in the chat interface.

The plant chatbot can have a simple personality system. For MVP, each plant could be assigned a tone based on its plant type or rarity. For example, common plants might sound friendly and casual, rare plants might sound mysterious, invasive plants might sound bold or defensive, and delicate flowers might sound gentle. This personality layer makes the feature more engaging without requiring complicated AI training.

The chat should still be factual. The plant can "speak" in a fun way, but the answers should come from the plant's Library information. For example, a Red Maple could say, "I usually grow in moist forests, wetlands, and urban areas," instead of making up facts. This keeps the feature educational while still making it feel interactive.

The backend should store chat messages if the app wants users to return to past conversations. A basic chat history system would store the user ID, plant ID, user message, AI response, and timestamp. However, for a simpler MVP, the app could avoid saving chat history and only display the current conversation during the session.

A basic plant chat record would include:

- Chat ID
- User ID
- Plant ID
- User message
- AI response
- Timestamp

This feature connects directly to the PlantDex. Once a user discovers a plant, they unlock that plant's chat option. This makes discovery more rewarding because each new PlantDex entry gives the user a new plant character to interact with.

For example, after discovering Red Maple, the user could ask: "Where do you usually grow?", "Are you native to my area?", "How can I identify you?", "Why do your leaves turn red?", and "What animals use you?"

This feature is technically feasible because it uses standard API-based AI integration. The app already needs a plant Library, so the chatbot can reuse that data. The main implementation tasks are creating a chat interface, retrieving plant data from the database, sending prompts to an AI model, displaying responses, and optionally storing conversation history.

The technical complexity is moderate. The chatbot itself is easy to connect through an API, but the quality of the responses depends on how well the app structures the plant data and prompt. The MVP version should keep the chatbot focused on plant education, identification, habitat, rarity, and discovery-related questions. This feature differentiates the app from a normal plant identification tool. Instead of only telling the user what plant they found, the app allows the user to interact with the plant and learn from it in a more engaging way.

---

## 6. Final MVP Tech Stack (with Vercel)

### Frontend — React Native + Expo

Used for the mobile app. Handles: camera, GPS/location tracking, projected map screen, PlantDex, Library, user profiles, friends, forum/feed, photo posting, and plant chat UI.

### Backend — Vercel-hosted Node.js / Next.js API

Used for backend logic. Handles: Prisma database queries, OpenAI API calls, plant identification workflow, point calculation, PlantDex updates, creating new Library entries, post/comment/like logic, and friend request logic. The mobile app calls Vercel API routes instead of talking directly to Prisma.

### ORM — Prisma

Used to define and manage database tables without manually writing most SQL. Handles: database schema, migrations, type-safe database queries, and tables for users, plants, observations, PlantDex, posts, likes, comments, and friends.

### Database — Supabase Postgres

Used as the actual database. Stores: users/profiles, plant Library entries, PlantDex entries, observations, GPS coordinates, posts, likes, comments, friend requests, and points.

### Auth — Supabase Auth

Used for: signup, login, user sessions, and user identity. The app logs users in with Supabase Auth, then uses that user ID when calling the Vercel backend.

### Image Storage — Supabase Storage

Used for: plant photos, profile pictures, forum images, and post images. The image file goes into Supabase Storage. The database stores the image path or URL.

### AI — OpenAI API

Used for: plant chatbot, plant personality responses, and possibly plant image identification for MVP. The OpenAI API key should live only in the Vercel backend, never inside the React Native app.

### Map — Mapbox

Used for: stylized projected map, user location, plant markers, friend discovery markers, and custom nature-themed map design.

### Final Architecture

```
React Native + Expo App
        ↓
Vercel Backend API
        ↓
Prisma ORM
        ↓
Supabase Postgres
```

For images:

```
React Native App
        ↓
Supabase Storage
        ↓
Image path saved in Supabase Postgres
```

For AI:

```
React Native App
        ↓
Vercel Backend API
        ↓
OpenAI API
```

### Final Stack Summary

| Layer | Technology |
| --- | --- |
| Mobile frontend | React Native + Expo |
| Backend hosting | Vercel |
| Backend framework | Next.js API routes or Node.js API |
| ORM | Prisma |
| Database | Supabase Postgres |
| Authentication | Supabase Auth |
| Image storage | Supabase Storage |
| AI | OpenAI API |
| Map | Mapbox |

This stack is valid for the MVP and allows the use of Prisma while avoiding self-managed servers.

---

## 7. Additional Technical Requirements

### 7.1 Authentication and Backend Security

The application will use Supabase Auth to handle user signup, login, and session management. When a user logs in, Supabase provides a session token that identifies the authenticated user.

When the React Native app sends requests to the Vercel backend, the request should include the user's Supabase session token. The Vercel backend should verify this token before allowing the user to create observations, upload plant discoveries, create posts, like content, send friend requests, or update PlantDex data. This is important because users should not be able to fake actions for another account. Every protected backend action should be tied to the authenticated user ID.

Private API keys should never be stored inside the React Native app. OpenAI keys, Supabase service keys, and any future plant identification API keys should be stored as environment variables in the Vercel backend. The mobile app should call the backend, and the backend should call external services.

### 7.2 Image Upload and Processing Flow

When a user takes a photo of a plant, the app will upload the image to Supabase Storage. Supabase Storage will store the actual image file, while Supabase Postgres will store the image path or URL.

The flow should work like this:

1. The user takes a plant photo in the React Native app.
2. The image is uploaded to Supabase Storage.
3. Supabase returns an image path or URL.
4. The app sends the image path, GPS coordinates, timestamp, and user session token to the Vercel backend.
5. The backend creates an observation record in the database.
6. The backend sends the image to the AI identification system.
7. The AI returns a predicted plant name and confidence score.
8. The backend links the observation to a Library entry or creates a new Library entry if needed.
9. The backend updates the user's PlantDex and awards points.

This separates file storage from database storage. The image itself stays in Supabase Storage, while the database stores structured metadata about the image.

### 7.3 AI Identification Decision

For the MVP, the application will initially use OpenAI vision capabilities to identify plants from user-submitted images. The AI system should return a predicted scientific name, common name, and confidence score.

If the AI identifies a plant that already exists in the Library, the backend will link the observation to that existing plant entry. If the AI identifies a plant that does not exist in the Library, the backend can automatically create a new Library entry as long as the confidence score passes a minimum threshold. For example, if the AI confidence is above 85 percent, the app can create the new Library entry. If the confidence is below the threshold, the observation can still be saved, but it should be marked as uncertain.

OpenAI can be used for MVP simplicity. In the future, the app may add a specialized plant identification API, such as Plant.id or Pl@ntNet, if higher species-level accuracy is needed.

### 7.4 Location Privacy

Because the app stores GPS coordinates, location privacy should be built into the MVP.

Each observation should have a privacy setting. The options should include public, friends-only, and private.

Public observations should not always show exact GPS coordinates. For common plants, approximate public locations may be acceptable. For rare or sensitive plants, exact locations should be hidden or blurred to protect the species and the user's privacy.

The original user should be able to view their own exact discovery location. Other users should only see the level of location detail allowed by the observation's privacy setting.

### 7.5 Prisma Models Needed

The app should use Prisma to define the main database models. The core models needed for the MVP are:

- `User` or `Profile`
- `Plant`
- `Observation`
- `PlantDexEntry`
- `Post`
- `Like`
- `Comment`
- `FriendRequest`
- `Friendship`
- `ChatMessage`

The `Plant` model represents the global Library. The `PlantDexEntry` model represents the plants discovered by each user. The `Observation` model stores each photo-based plant discovery. The `Post`, `Like`, and `Comment` models support the social feed and forum. The `FriendRequest` and `Friendship` models support the social system. The `ChatMessage` model stores optional plant chatbot history.

### 7.6 Deployment and Environment Variables

The backend will be deployed using Vercel. The backend will contain the API routes that handle Prisma queries, OpenAI requests, point calculation, PlantDex updates, friend requests, posts, comments, and likes.

Sensitive values should be stored as Vercel environment variables. These include:

- Supabase database URL
- Supabase API keys
- Supabase service role key, if needed for backend-only operations
- OpenAI API key
- Mapbox token
- Any future plant identification API key

Prisma migrations will be used to manage database schema changes. This allows the team to update the database structure in a controlled way as the app grows.

### 7.7 Cost and Rate Limit Considerations

The MVP depends on several external services, including OpenAI, Supabase, Vercel, and Mapbox. These services may have usage limits or costs depending on the number of users, images, AI requests, map loads, and database activity.

To reduce unnecessary costs, the app should avoid re-identifying the same image multiple times. Once a plant image has been processed, the AI result should be stored in the database and reused.

The app should also cache frequently accessed Library data when possible. Since plant Library entries do not change often, the app does not need to refetch the same plant information repeatedly.

AI chatbot requests should be routed through the backend so the app can control usage, prevent abuse, and protect the OpenAI API key.

### 7.8 Moderation and Safety

Because users can post photos, captions, comments, and forum messages, the MVP should include basic moderation tools.

At minimum, users should be able to report inappropriate posts or comments. Admin users should be able to delete reported content if necessary.

The app should also prevent users from editing or deleting content that does not belong to them. Users should only be able to update their own profile, observations, posts, comments, and likes.

For the MVP, moderation can remain simple. A report button and admin delete ability are enough for the first version.

---

## 8. MVP Completion Criteria

The MVP should be considered complete when a user can:

1. Create an account and log in.
2. View a projected map with their current location.
3. Take a photo of a plant.
4. Upload the image to Supabase Storage.
5. Send the image to AI for identification.
6. Receive a predicted plant name and confidence score.
7. Store the observation with GPS coordinates.
8. Add the identified plant to their PlantDex.
9. Earn points based on the discovery.
10. View the plant in the Library and PlantDex.
11. Post the plant photo to the social feed.
12. Like and comment on posts.
13. Add friends.
14. Use the forum-style discussion page.
15. Open a plant and ask it questions through the AI chatbot.

Once these actions work together, the core MVP flow is complete.

---
