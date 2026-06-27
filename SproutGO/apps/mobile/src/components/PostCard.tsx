// Shared discovery/forum post card (design §8.13 / §9.2). Used in the feed and on profiles.
// Pure presentation + callbacks — the parent owns the optimistic like toggle and navigation.
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import type { Post } from "@sproutgo/shared";
import { useRouter } from "expo-router";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { RarityBadge, Avatar } from "@/components/ui";
import { timeAgo } from "@/lib/time";

export function PostCard({
  post,
  onToggleLike,
  onOpen,
  onMore,
}: {
  post: Post;
  onToggleLike: (post: Post) => void;
  onOpen: (post: Post) => void;
  onMore?: (post: Post) => void;
}) {
  const router = useRouter();
  const plant = post.plant;
  return (
    <View style={styles.postCard}>
      <View style={styles.postHead}>
        <Pressable
          style={styles.postAuthor}
          onPress={() => router.push(`/profile/${post.author.id}`)}
        >
          <Avatar uri={post.author.avatarUrl ?? ""} size={40} />
          <View>
            <Text style={styles.authorName}>{post.author.username}</Text>
            <Text style={typography.caption}>
              {timeAgo(post.createdAt)}
              {post.generalLocation ? ` • ${post.generalLocation}` : ""}
            </Text>
          </View>
        </Pressable>
        {onMore ? (
          <Pressable hitSlop={8} onPress={() => onMore(post)}>
            <Icon name="more-horiz" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {post.imageUrl ? (
        <Pressable style={styles.imageWrap} onPress={() => onOpen(post)}>
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
          {plant ? (
            <View style={styles.badgeOverlay}>
              <RarityBadge rarity={plant.rarity} />
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <View style={styles.postBody}>
        {plant ? (
          <>
            <Text style={typography.sectionTitle}>
              {plant.commonName ?? plant.scientificName}
            </Text>
            <Text style={typography.scientificName}>{plant.scientificName}</Text>
          </>
        ) : post.title ? (
          <Text style={typography.sectionTitle}>{post.title}</Text>
        ) : null}
        {post.caption ? (
          <Text
            style={[typography.body, { color: colors.textMuted, marginVertical: spacing.sm }]}
            numberOfLines={3}
          >
            {post.caption}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => onToggleLike(post)} hitSlop={8}>
            <Icon
              name={post.likedByMe ? "favorite" : "favorite-border"}
              size={22}
              color={post.likedByMe ? colors.tertiary : colors.textMuted}
            />
            <Text style={typography.caption}>{post.likeCount}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => onOpen(post)} hitSlop={8}>
            <Icon name="chat-bubble-outline" size={20} color={colors.textMuted} />
            <Text style={typography.caption}>{post.commentCount}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          {plant ? (
            <Pressable style={styles.viewBtn} onPress={() => router.push(`/plant/${plant.id}`)}>
              <Text style={styles.viewBtnText}>View Plant</Text>
              <Icon name="arrow-forward" size={15} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.sage,
    overflow: "hidden",
  },
  postHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  postAuthor: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  authorName: { ...typography.caption, fontWeight: "600", color: colors.text },
  imageWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surfaceVariant },
  postImage: { width: "100%", height: "100%" },
  badgeOverlay: { position: "absolute", top: spacing.md, right: spacing.md },
  postBody: { padding: spacing.md },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    paddingTop: spacing.sm,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewBtnText: { ...typography.badge, color: colors.primary },
});
