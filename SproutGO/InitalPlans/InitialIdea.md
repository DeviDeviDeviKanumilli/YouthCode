# SproutGo — Initial Idea

## Background

Me and a group of friends originally created an idea called **SproutShare** to allow people to share information about their plants, trade their plants, and show off their plants in a chat-like environment. However, we are now seeking to create something much more engaging, visual-focused, with a tie-in to geotagging.

---

## Core Loop

Although not a game, our main game-like idea is as follows:

1. **Capture** — Throughout their days, as users interact with nature and explore their surroundings, they take pictures of plants, flowers, and trees they see.
2. **Identify** — After taking a photo, an AI model (most likely) identifies the species of plant, flower, or tree in the photo.
3. **Geotag** — The specific GPS information of where the photo was taken is stored for display in the application.
4. **Earn points** — The user receives points proportional to the rarity of the species, with bonus points for species they haven't seen before.

Beyond this basic loop of capturing and earning points, there will be many more aspects to make the project engaging and interactive, especially within a community.

---

## Community Map

Over time, as people capture species with geotagged locations, a map will be created. This map will:

- Highlight the location of different plant species in the local region near a user
- Expand as the app grows and more people use it
- Enable people to visit locations where others have taken photos, capture that species themselves, and earn points

**The real purpose of this app is to facilitate exploration into nature.** Users will be motivated to visit new, different areas to encounter a variety of plants. The application will facilitate the connection between users and nature.

**In summary, the map will:**

- Show locations where other people took photos
- Display the rarity of species captured
- Allow browsing of images of different species in different areas

---

## Media & Community Feed

Whenever a user takes a photo, it is added to a media feed — almost Reddit-style. People will be able to upvote, downvote, or comment on the environments and plants others capture. This will facilitate community building and interaction between people who love nature and like to explore.

> **Note:** This feature may or may not be associated with the picture-sharing flow described above.

A media platform will also enable users to communicate with each other and post (like a blog) about where they have been in nature and what they have seen. This supports:

- Scenic landscapes
- Trail recommendations
- Collections of images from a trail
- Deeper community interactions

---

## Friend Maps & Profiles

People who know each other well will be able to friend each other on the map. From there, they can view an individual person's map to see:

- Where they have been over time
- All the cool things they have seen
- Their progression across the land

A friend's profile will display:

- Their portfolio of images
- An interactive map (similar to the global map, but showing only their photos and locations)
- Possibly a timeline showing where they have been over time

---

## Plant Database & PlantDex

This project connects to our initial project **SproutShare**, as both contain plant databases. For SproutGo, the database will be more accurate, sourced via:

- (a) An external API
- (b) Scraping
- (c) An LLM to retrieve plant data

The database will show the collection of plants and their properties — for curiosity and to document the variety of species the SproutGo community has found.

**PlantDex** — Similar to the Pokédex in Pokémon, as users capture new species, they fill out entries in their personal PlantDex. Each species page could include:

- Locations where those plants can be found (for rare species; omitted if sufficiently common)
- General descriptions and information
- Top upvoted photos from the community

---

## Exploration Incentives

There are diminishing returns on taking photos of the same species to incentivize exploration. For example, there might be daily quotas for how many photos of the same species a user may take per day.

---

## Trails & Hikes

*(Placement TBD — possibly connected to the friend-tracking experience.)*

People might show the trails or hikes they've been on and what they've seen there.

---

## Quests & Leaderboards

- **Daily and weekly quests** to earn points
- **Leaderboards** showing who globally — and within a network of friends — is most connected to nature

---

## Future Ecological Applications

If the app gains enough users, there could be larger ecological applications. Once users populate the geotagged global map in an area sufficiently:

- **Biodiversity indices** — Alpha, beta, and gamma diversity can be calculated, producing a visual representation of biodiversity around a region
- **Invasive species tracking** — Information on the spread of invasive species can be gathered
- **Institutional partnerships** — Data could be integrated into universities or local conservation organizations; the map becomes more valuable as it grows
- **Flowering trends** — Images can be analyzed to show flowering patterns over time
- **Climate change analysis** — Over long periods, effects of climate change can be studied via realized vs. actual niches, changes in realized niche over time, or maps showing competition between invasive and non-invasive species
