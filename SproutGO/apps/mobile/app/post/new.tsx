// Create Post (design §15). Two modes, driven by route params:
//  - Discovery post: ?observationId=&plantId= (image/plant inherited server-side from the obs).
//  - Forum thread:   ?category=KEY (title + body, no image required).
// Submits to POST /posts and opens the created post.
import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Post, ForumCategory, Privacy } from "@sproutgo/shared";
import { FORUM_CATEGORIES } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";
import { api, ApiClientError } from "@/lib/api";

const PRIVACY: { key: Privacy; label: string; icon: IconName }[] = [
  { key: "PUBLIC", label: "Public", icon: "public" },
  { key: "FRIENDS", label: "Friends", icon: "group" },
  { key: "PRIVATE", label: "Private", icon: "lock" },
];

export default function CreatePost() {
  const router = useRouter();
  const params = useLocalSearchParams<{ observationId?: string; plantId?: string; category?: string }>();
  const category = FORUM_CATEGORIES.find((c) => c.key === params.category)?.key as ForumCategory | undefined;
  const isForum = !!category;

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("PUBLIC");
  const [submitting, setSubmitting] = useState(false);

  const canShare = caption.trim().length > 0 || (isForum && title.trim().length > 0);

  const share = () => {
    if (!canShare || submitting) return;
    setSubmitting(true);
    api
      .post<Post>("/posts", {
        observationId: params.observationId,
        plantId: params.plantId,
        category,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
        // Forum threads are always public so others can find them.
        privacy: isForum ? "PUBLIC" : privacy,
      })
      .then((created) => router.replace(`/post/${created.id}`))
      .catch((e) => {
        Alert.alert("Couldn't share", e instanceof ApiClientError ? e.message : "Please try again.");
        setSubmitting(false);
      });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="close" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={typography.sectionTitle}>{isForum ? "New Thread" : "New Discovery Post"}</Text>
        <Pressable hitSlop={8} onPress={share} disabled={!canShare || submitting}>
          <Text style={[styles.share, (!canShare || submitting) && styles.shareDisabled]}>
            {submitting ? "…" : "Share"}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isForum ? (
          <>
            <Text style={styles.label}>Posting in {FORUM_CATEGORIES.find((c) => c.key === category)?.label}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Thread title"
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
            />
          </>
        ) : params.observationId || params.plantId ? (
          <View style={styles.attached}>
            <Icon name="eco" size={18} color={colors.primary} />
            <Text style={typography.caption}>Your latest discovery photo will be attached.</Text>
          </View>
        ) : (
          <View style={styles.attached}>
            <Icon name="info" size={18} color={colors.textMuted} />
            <Text style={typography.caption}>Share a thought with the community.</Text>
          </View>
        )}

        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder={isForum ? "What do you want to discuss?" : "Share the story of your find…"}
          placeholderTextColor={colors.textMuted}
          style={styles.caption}
          multiline
        />

        {!isForum ? (
          <>
            <Text style={styles.label}>Who can see this?</Text>
            <View style={styles.privacyRow}>
              {PRIVACY.map((p) => {
                const active = privacy === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => setPrivacy(p.key)}
                    style={[styles.privacyChip, active && styles.privacyChipActive]}
                  >
                    <Icon name={p.icon} size={18} color={active ? colors.onPrimary : colors.textMuted} />
                    <Text style={[styles.privacyText, active && { color: colors.onPrimary }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: spacing.md,
  },
  share: { ...typography.body, fontWeight: "700", color: colors.primary },
  shareDisabled: { color: colors.textMuted, opacity: 0.5 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  attached: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { ...typography.caption, fontWeight: "600", marginTop: spacing.sm },
  titleInput: {
    ...typography.body,
    fontWeight: "600",
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  caption: {
    ...typography.body,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  privacyRow: { flexDirection: "row", gap: spacing.sm },
  privacyChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  privacyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  privacyText: { ...typography.badge, color: colors.textMuted },
});
