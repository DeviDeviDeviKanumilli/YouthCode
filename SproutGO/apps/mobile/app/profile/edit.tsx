// Edit Profile (design §8.15). Loads the caller's profile (GET /profile/me) and saves changes
// via PATCH /profile/me (username + bio; avatar upload is post-MVP).
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Image, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ProfileWithStats } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { api, ApiClientError } from "@/lib/api";

export default function EditProfile() {
  const router = useRouter();
  const [me, setMe] = useState<ProfileWithStats | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get<ProfileWithStats>("/profile/me")
      .then((p) => {
        setMe(p);
        setUsername(p.username);
        setBio(p.bio ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const save = () => {
    if (saving) return;
    const body: { username?: string; bio?: string } = {};
    if (username.trim() && username.trim() !== me?.username) body.username = username.trim();
    if (bio !== (me?.bio ?? "")) body.bio = bio.trim();
    if (Object.keys(body).length === 0) {
      router.back();
      return;
    }
    setSaving(true);
    api
      .patch("/profile/me", body)
      .then(() => router.back())
      .catch((e) => {
        Alert.alert("Couldn't save", e instanceof ApiClientError ? e.message : "Please try again.");
        setSaving(false);
      });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="close" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={typography.sectionTitle}>Edit Profile</Text>
        <Pressable hitSlop={8} onPress={save} disabled={saving}>
          <Text style={[styles.save, saving && { opacity: 0.5 }]}>{saving ? "…" : "Save"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: me?.avatarUrl ?? "" }} style={styles.avatar} />
            <Pressable style={styles.avatarBadge}>
              <Icon name="photo-camera" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>

          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            prefix="@"
            autoCapitalize="none"
          />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell explorers about yourself"
            multiline
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({
  label,
  prefix,
  multiline,
  ...input
}: {
  label: string;
  prefix?: string;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, multiline && styles.inputMultiline]}
          multiline={multiline}
          {...input}
        />
      </View>
    </View>
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
  save: { ...typography.body, fontWeight: "700", color: colors.primary },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  avatarWrap: { alignSelf: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceVariant },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, fontWeight: "600", marginLeft: spacing.xs },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputWrapMultiline: { height: 120, alignItems: "flex-start", paddingVertical: spacing.md },
  prefix: { ...typography.body, color: colors.textMuted, marginRight: 2 },
  input: { flex: 1, ...typography.body, paddingVertical: 0 },
  inputMultiline: { height: "100%", textAlignVertical: "top" },
});
