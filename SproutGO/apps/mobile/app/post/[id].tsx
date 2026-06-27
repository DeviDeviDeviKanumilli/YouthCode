// Post detail + comment thread (design §8.13 comment sheet / §8.14 forum thread). Fetches
// GET /posts/:id, lets the viewer like, comment, report, or (owner/admin) delete.
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Comment, Post, PostDetailResponse } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { PostCard } from "@/components/PostCard";
import { api, ApiClientError } from "@/lib/api";
import { timeAgo } from "@/lib/time";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PostDetailResponse>(`/posts/${id}`)
      .then((res) => {
        if (!cancelled) {
          setPost(res.post);
          setComments(res.comments);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof ApiClientError
              ? e.status === 404
                ? "This post is unavailable."
                : e.message
              : "Could not load this post.",
          );
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(load, [load]);

  const toggleLike = useCallback((p: Post) => {
    const liked = !p.likedByMe;
    setPost((cur) => (cur ? { ...cur, likedByMe: liked, likeCount: cur.likeCount + (liked ? 1 : -1) } : cur));
    const req = liked ? api.post(`/posts/${p.id}/like`) : api.delete(`/posts/${p.id}/like`);
    req
      .then((r) => setPost((cur) => (cur ? { ...cur, likeCount: (r as { likeCount: number }).likeCount } : cur)))
      .catch(() => setPost((cur) => (cur ? { ...cur, likedByMe: p.likedByMe, likeCount: p.likeCount } : cur)));
  }, []);

  const sendComment = useCallback(() => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    api
      .post<Comment>(`/posts/${id}/comments`, { body })
      .then((c) => {
        setComments((cur) => [...cur, c]);
        setPost((cur) => (cur ? { ...cur, commentCount: cur.commentCount + 1 } : cur));
        setDraft("");
      })
      .catch((e) => Alert.alert("Couldn't post comment", e instanceof ApiClientError ? e.message : "Try again."))
      .finally(() => setSending(false));
  }, [draft, sending, id]);

  const onMore = useCallback(
    (p: Post) => {
      const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
      if (p.canDelete) {
        options.push({
          text: "Delete post",
          style: "destructive",
          onPress: () =>
            api
              .delete(`/posts/${p.id}`)
              .then(() => router.back())
              .catch((e) => Alert.alert("Delete failed", e instanceof ApiClientError ? e.message : "Try again.")),
        });
      }
      if (!p.isOwn) {
        options.push({
          text: "Report post",
          onPress: () =>
            api
              .post(`/posts/${p.id}/report`, { reason: "Reported from the app" })
              .then(() => Alert.alert("Reported", "Thanks — our team will review this post."))
              .catch((e) => Alert.alert("Report failed", e instanceof ApiClientError ? e.message : "Try again.")),
        });
      }
      options.push({ text: "Cancel", style: "cancel" });
      Alert.alert("Post options", undefined, options);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={typography.sectionTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : error || !post ? (
        <View style={styles.notice}>
          <Icon name="cloud-off" size={32} color={colors.textMuted} />
          <Text style={styles.noticeText}>{error ?? "Post not found."}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <PostCard post={post} onToggleLike={toggleLike} onOpen={() => {}} onMore={onMore} />

            <Text style={[typography.sectionTitle, { marginTop: spacing.lg }]}>
              {post.commentCount} {post.commentCount === 1 ? "Comment" : "Comments"}
            </Text>
            {comments.length === 0 ? (
              <Text style={[typography.caption, { paddingVertical: spacing.md }]}>
                No comments yet. Start the conversation!
              </Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.comment}>
                  <Avatar uri={c.author.avatarUrl ?? ""} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentHead}>
                      {c.author.username} <Text style={typography.caption}>· {timeAgo(c.createdAt)}</Text>
                    </Text>
                    <Text style={typography.body}>{c.body}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.replyBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textMuted}
              style={styles.replyInput}
              multiline
            />
            <Pressable
              style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}
              onPress={sendComment}
              disabled={!draft.trim() || sending}
            >
              <Icon name="send" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  comment: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  commentHead: { ...typography.caption, fontWeight: "600", color: colors.text },
  replyBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceLowest,
  },
  replyInput: {
    flex: 1,
    ...typography.body,
    maxHeight: 100,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  noticeText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
