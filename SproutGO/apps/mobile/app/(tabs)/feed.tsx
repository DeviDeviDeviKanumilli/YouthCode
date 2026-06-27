// Feed tab (design §8.13). Segments map to API scopes: Discoveries→feed, Friends→friends,
// Forums→a category list. Posts come from GET /posts?scope=; likes toggle optimistically; the
// comment count and image open the post thread. FAB composes a new post.
import { useCallback, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import type { Post, PostsResponse } from "@sproutgo/shared";
import { FORUM_CATEGORIES } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { AppHeader } from "@/components/ui";
import { PostCard } from "@/components/PostCard";
import { api, ApiClientError } from "@/lib/api";

const SEGMENTS = [
  { label: "Discoveries", scope: "feed" },
  { label: "Friends", scope: "friends" },
  { label: "Forums", scope: "forum" },
] as const;

export default function FeedScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<(typeof SEGMENTS)[number]["scope"]>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (scope === "forum") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PostsResponse>(`/posts?scope=${scope}`)
      .then((res) => !cancelled && setPosts(res.posts))
      .catch((e) =>
        !cancelled &&
        setError(e instanceof ApiClientError ? e.message : "Could not load the feed."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scope]);

  useFocusEffect(load);

  // Optimistic like toggle — flip locally, reconcile with the server, revert on failure.
  const toggleLike = useCallback((post: Post) => {
    const liked = !post.likedByMe;
    setPosts((cur) =>
      cur.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
          : p,
      ),
    );
    const req = liked ? api.post(`/posts/${post.id}/like`) : api.delete(`/posts/${post.id}/like`);
    req
      .then((r) => {
        const { likeCount } = r as { likeCount: number };
        setPosts((cur) => cur.map((p) => (p.id === post.id ? { ...p, likeCount } : p)));
      })
      .catch(() =>
        setPosts((cur) =>
          cur.map((p) =>
            p.id === post.id
              ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount }
              : p,
          ),
        ),
      );
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="SproutGo" />
      <View style={styles.segmentRow}>
        {SEGMENTS.map((s) => (
          <Pressable
            key={s.scope}
            onPress={() => setScope(s.scope)}
            style={[styles.segment, scope === s.scope ? styles.segmentActive : styles.segmentIdle]}
          >
            <Text
              style={[styles.segmentText, { color: scope === s.scope ? colors.onPrimary : colors.textMuted }]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {scope === "forum" ? (
          FORUM_CATEGORIES.map((c) => (
            <Pressable key={c.key} style={styles.forumCard} onPress={() => router.push(`/forums/${c.key}`)}>
              <View style={styles.forumIcon}>
                <Icon name="forum" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { fontWeight: "600", color: colors.text }]}>{c.label}</Text>
                <Text style={typography.caption}>Tap to browse threads</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          ))
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : error ? (
          <View style={styles.notice}>
            <Icon name="cloud-off" size={32} color={colors.textMuted} />
            <Text style={styles.noticeText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.notice}>
            <Icon name="eco" size={32} color={colors.textMuted} />
            <Text style={styles.noticeText}>
              {scope === "friends"
                ? "No posts from friends yet. Add some explorers!"
                : "No discoveries shared yet. Be the first!"}
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onToggleLike={toggleLike}
              onOpen={(p) => router.push(`/post/${p.id}`)}
            />
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push("/post/new")}>
        <Icon name="add" size={28} color={colors.onPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  segmentRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  segment: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.primary },
  segmentIdle: { backgroundColor: colors.surfaceLowest, borderWidth: 1, borderColor: colors.sage },
  segmentText: { ...typography.badge },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.deep,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  forumCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.sage,
    padding: spacing.md,
  },
  forumIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  noticeText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radius.button, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
});
