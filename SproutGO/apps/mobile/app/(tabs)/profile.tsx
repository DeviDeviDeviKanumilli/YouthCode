// Profile tab (design §8.15). Fetches the caller's own public profile (GET /profile/:id with
// the session user id → friendship "self") and renders it via the shared ProfileContent, with
// Edit / Friends actions and Sign out. Stats, recent discoveries, and posts are all real.
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import type { PublicProfileResponse } from "@sproutgo/shared";
import { useAuth } from "@/lib/auth";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { AppHeader } from "@/components/ui";
import { ProfileContent } from "@/components/ProfileContent";
import { api, ApiClientError } from "@/lib/api";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const uid = session?.user?.id;

  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!uid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PublicProfileResponse>(`/profile/${uid}`)
      .then((res) => !cancelled && setData(res))
      .catch((e) =>
        !cancelled && setError(e instanceof ApiClientError ? e.message : "Could not load your profile."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useFocusEffect(load);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        title="SproutGo"
        right={
          <Pressable hitSlop={8} onPress={() => router.push("/settings")}>
            <Icon name="settings" size={24} color={colors.textMuted} />
          </Pressable>
        }
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : error || !data ? (
        <View style={styles.notice}>
          <Icon name="cloud-off" size={32} color={colors.textMuted} />
          <Text style={styles.noticeText}>{error ?? "Profile unavailable."}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ProfileContent
          data={data}
          headerAction={
            <>
              <Pressable style={styles.editBtn} onPress={() => router.push("/profile/edit")}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => router.push("/friends")}>
                <Icon name="group" size={20} color={colors.primary} />
              </Pressable>
            </>
          }
          footer={
            <Pressable style={styles.signOut} onPress={signOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  editBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 24, paddingVertical: 10 },
  editBtnText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
  iconBtn: {
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.pill,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  signOut: {
    marginTop: spacing.xl,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.button,
    padding: spacing.md,
    alignItems: "center",
  },
  signOutText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
  notice: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  noticeText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radius.button, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { ...typography.body, color: colors.onPrimary, fontWeight: "600" },
});
