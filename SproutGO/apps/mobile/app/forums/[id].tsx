// Forum category view (design §8.14). The route param is a FORUM_CATEGORIES key; this lists
// PUBLIC posts in that category (GET /posts?scope=forum&category=KEY). A "thread" is a post —
// tapping one opens /post/:id with its comments. The FAB starts a new thread in this category.
import { useCallback, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import type { Post, PostsResponse } from "@sproutgo/shared";
import { FORUM_CATEGORIES } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { timeAgo } from "@/lib/time";

export default function ForumCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const category = FORUM_CATEGORIES.find((c) => c.key === id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PostsResponse>(`/posts?scope=forum&category=${id}`)
      .then((res) => !cancelled && setPosts(res.posts))
      .catch((e) =>
        !cancelled && setError(e instanceof ApiClientError ? e.message : "Could not load this forum."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(load);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={typography.sectionTitle} numberOfLines={1}>
          {category?.label ?? "Forum"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
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
            <Icon name="forum" size={32} color={colors.textMuted} />
            <Text style={styles.noticeText}>No threads yet. Start the first discussion!</Text>
          </View>
        ) : (
          posts.map((p) => (
            <Pressable key={p.id} style={styles.threadCard} onPress={() => router.push(`/post/${p.id}`)}>
              <Avatar uri={p.author.avatarUrl ?? ""} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { fontWeight: "600", color: colors.text }]} numberOfLines={1}>
                  {p.title ?? p.caption ?? "Untitled thread"}
                </Text>
                <Text style={typography.caption} numberOfLines={1}>
                  {p.author.username} · {timeAgo(p.createdAt)} · {p.commentCount} replies
                </Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push(`/post/new?category=${id}`)}>
        <Icon name="add" size={28} color={colors.onPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.sm },
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.sage,
    padding: spacing.md,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  notice: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  noticeText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radius.button, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
});
