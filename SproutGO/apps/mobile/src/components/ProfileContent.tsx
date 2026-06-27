// Shared profile body (design §8.15) for both the own-profile tab and another user's public
// profile. Renders the header (avatar/username/bio + a caller-supplied action), a stats bento,
// completion progress, recent discoveries, and the user's posts. The header action differs:
// Edit/Sign-out for self, Add-Friend/respond for others.
import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import type { Post, PublicProfileResponse } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";
import { RarityBadge, SectionTitle, Avatar } from "@/components/ui";
import { PostCard } from "@/components/PostCard";
import { api } from "@/lib/api";

export function ProfileContent({
  data,
  headerAction,
  footer,
}: {
  data: PublicProfileResponse;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, stats, recentDiscoveries } = data;
  const [posts, setPosts] = useState<Post[]>(data.posts);

  const stat: { value: number; label: string; icon: IconName; color: string }[] = [
    { value: stats.totalPoints, label: "Points", icon: "eco", color: colors.rarity.RARE },
    { value: stats.speciesDiscovered, label: "Species", icon: "local-florist", color: colors.rarity.COMMON },
    { value: stats.postsCount, label: "Posts", icon: "photo-library", color: colors.secondary },
    { value: stats.friendsCount, label: "Friends", icon: "group", color: colors.gold },
  ];

  const toggleLike = (post: Post) => {
    const liked = !post.likedByMe;
    setPosts((cur) =>
      cur.map((p) => (p.id === post.id ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) } : p)),
    );
    const req = liked ? api.post(`/posts/${post.id}/like`) : api.delete(`/posts/${post.id}/like`);
    req
      .then((r) =>
        setPosts((cur) => cur.map((p) => (p.id === post.id ? { ...p, likeCount: (r as { likeCount: number }).likeCount } : p))),
      )
      .catch(() =>
        setPosts((cur) =>
          cur.map((p) => (p.id === post.id ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount } : p)),
        ),
      );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Image source={{ uri: profile.avatarUrl ?? "" }} style={styles.avatar} />
        <Text style={[typography.sectionTitle, { marginTop: spacing.md }]}>{profile.username}</Text>
        {profile.bio ? <Text style={[typography.body, styles.bio]}>{profile.bio}</Text> : null}
        {headerAction ? <View style={styles.headerActions}>{headerAction}</View> : null}
      </View>

      <View style={styles.bento}>
        {stat.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Icon name={s.icon} size={22} color={s.color} />
            <Text style={styles.statValue}>{s.value.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHead}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
            <Text style={styles.bigPct}>{stats.completionPct}%</Text>
            <Text style={[typography.caption, { marginBottom: 4 }]}>PlantDex Completion</Text>
          </View>
          <Text style={typography.badge}>{stats.rareFound} rare</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${stats.completionPct}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      {recentDiscoveries.length > 0 ? (
        <>
          <SectionTitle>Recent Discoveries</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRow}>
            {recentDiscoveries.map((e) => (
              <Pressable key={e.id} style={styles.discoveryCard} onPress={() => router.push(`/plant/${e.plant.id}`)}>
                <View style={styles.discoveryImgWrap}>
                  {e.plant.imageUrl ? <Image source={{ uri: e.plant.imageUrl }} style={styles.discoveryImg} /> : null}
                  <View style={styles.discoveryBadge}>
                    <RarityBadge rarity={e.plant.rarity} />
                  </View>
                </View>
                <Text style={[typography.body, { fontWeight: "600" }]} numberOfLines={1}>
                  {e.plant.commonName ?? e.plant.scientificName}
                </Text>
                <Text style={typography.scientificName} numberOfLines={1}>
                  {e.plant.scientificName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionTitle>Posts</SectionTitle>
      {posts.length === 0 ? (
        <Text style={[typography.caption, { paddingVertical: spacing.md }]}>No posts yet.</Text>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onToggleLike={toggleLike} onOpen={(x) => router.push(`/post/${x.id}`)} />
          ))}
        </View>
      )}

      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  header: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.surfaceLowest,
    backgroundColor: colors.surfaceVariant,
  },
  bio: { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm, maxWidth: 320 },
  headerActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  bento: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.cardLarge,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: { ...typography.largeTitle, fontSize: 26, color: colors.text },
  statLabel: { ...typography.badge, color: colors.textMuted, textTransform: "uppercase" },
  discoveryRow: { gap: spacing.md, paddingBottom: spacing.xl },
  discoveryCard: {
    width: 180,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  discoveryImgWrap: {
    width: "100%",
    height: 130,
    borderRadius: radius.image,
    overflow: "hidden",
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceVariant,
  },
  discoveryImg: { width: "100%", height: "100%" },
  discoveryBadge: { position: "absolute", top: spacing.sm, left: spacing.sm },
  progressCard: {
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: spacing.sm },
  bigPct: { ...typography.largeTitle, fontSize: 28, color: colors.primary },
  track: { height: 12, backgroundColor: colors.surfaceVariant, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
