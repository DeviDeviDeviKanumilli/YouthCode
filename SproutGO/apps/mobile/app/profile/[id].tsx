// Public profile of another explorer (design §8.15/§8.16). Fetches GET /profile/:id and renders
// the shared ProfileContent with a friendship-aware action button (Add / Requested / Respond /
// Friends). Accepting an incoming request happens on the Friends screen (needs the request id).
import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { FriendshipStatus, PublicProfileResponse } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { ProfileContent } from "@/components/ProfileContent";
import { api, ApiClientError } from "@/lib/api";

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [friendship, setFriendship] = useState<FriendshipStatus>("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PublicProfileResponse>(`/profile/${id}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setFriendship(res.friendship);
        }
      })
      .catch((e) =>
        !cancelled &&
        setError(
          e instanceof ApiClientError ? (e.status === 404 ? "User not found." : e.message) : "Could not load this profile.",
        ),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(load, [load]);

  const addFriend = () => {
    setBusy(true);
    api
      .post("/friends/requests", { receiverId: id })
      .then(() => setFriendship("outgoing"))
      .catch((e) => Alert.alert("Couldn't send request", e instanceof ApiClientError ? e.message : "Try again."))
      .finally(() => setBusy(false));
  };

  const unfriend = () => {
    Alert.alert("Remove friend?", "You'll need to send a new request to reconnect.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          api
            .delete(`/friends/${id}`)
            .then(() => setFriendship("none"))
            .catch((e) => Alert.alert("Failed", e instanceof ApiClientError ? e.message : "Try again."))
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  const action = () => {
    switch (friendship) {
      case "self":
        return (
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/profile/edit")}>
            <Text style={styles.primaryBtnText}>Edit Profile</Text>
          </Pressable>
        );
      case "friends":
        return (
          <Pressable style={styles.outlineBtn} onPress={unfriend} disabled={busy}>
            <Icon name="how-to-reg" size={18} color={colors.primary} />
            <Text style={styles.outlineBtnText}>Friends</Text>
          </Pressable>
        );
      case "outgoing":
        return (
          <View style={styles.disabledBtn}>
            <Text style={styles.disabledBtnText}>Requested</Text>
          </View>
        );
      case "incoming":
        return (
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/friends")}>
            <Text style={styles.primaryBtnText}>Respond to Request</Text>
          </Pressable>
        );
      default:
        return (
          <Pressable style={styles.primaryBtn} onPress={addFriend} disabled={busy}>
            <Icon name="person-add" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryBtnText}>Add Friend</Text>
          </Pressable>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={typography.sectionTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : error || !data ? (
        <View style={styles.notice}>
          <Icon name="cloud-off" size={32} color={colors.textMuted} />
          <Text style={styles.noticeText}>{error ?? "Profile unavailable."}</Text>
        </View>
      ) : (
        <ProfileContent data={data} headerAction={action()} />
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
    height: 56,
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  primaryBtnText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  outlineBtnText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  disabledBtn: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  disabledBtnText: { ...typography.body, color: colors.textMuted, fontWeight: "600" },
  notice: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  noticeText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
