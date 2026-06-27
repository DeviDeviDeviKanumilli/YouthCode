// Friends screen (design §8.16). Three views: my friends, incoming requests (accept/reject),
// and user search (send request). Wired to /friends, /friends/requests, /users/search. Search
// supersedes the mock "Suggested" section (dropped for MVP).
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import type {
  FriendRequestView,
  FriendRequestsResponse,
  FriendsResponse,
  UserSearchResponse,
  UserSummary,
} from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";

const SEGMENTS = ["Friends", "Requests"] as const;

export default function Friends() {
  const router = useRouter();
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]>("Friends");
  const [query, setQuery] = useState("");

  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [requests, setRequests] = useState<FriendRequestView[]>([]);
  const [results, setResults] = useState<UserSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<FriendsResponse>("/friends"),
      api.get<FriendRequestsResponse>("/friends/requests?box=incoming"),
    ])
      .then(([f, r]) => {
        if (!cancelled) {
          setFriends(f.friends);
          setRequests(r.requests);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  // Debounced user search (clears to friends list when the box is empty).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<UserSearchResponse>(`/users/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.users))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const sendRequest = (userId: string) => {
    setBusyId(userId);
    api
      .post("/friends/requests", { receiverId: userId })
      .then(() => setResults((cur) => cur?.filter((u) => u.id !== userId) ?? null))
      .catch(() => {})
      .finally(() => setBusyId(null));
  };

  const respond = (req: FriendRequestView, action: "accept" | "reject") => {
    setBusyId(req.id);
    api
      .patch(`/friends/requests/${req.id}`, { action })
      .then(() => {
        setRequests((cur) => cur.filter((r) => r.id !== req.id));
        if (action === "accept") setFriends((cur) => [...cur, req.user]);
      })
      .catch(() => {})
      .finally(() => setBusyId(null));
  };

  const searching = results !== null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={typography.sectionTitle}>Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchRow}>
        <Icon name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search explorers by username"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </View>

      {!searching ? (
        <View style={styles.segmentRow}>
          {SEGMENTS.map((s) => {
            const active = seg === s;
            const count = s === "Requests" ? requests.length : friends.length;
            return (
              <Pressable key={s} onPress={() => setSeg(s)} style={[styles.segment, active && styles.segmentActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {s} {count > 0 ? `(${count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : searching ? (
          results.length === 0 ? (
            <Text style={styles.empty}>No users match “{query.trim()}”.</Text>
          ) : (
            results.map((u) => (
              <Row key={u.id} user={u} onPress={() => router.push(`/profile/${u.id}`)}>
                <Pressable
                  style={styles.addBtn}
                  disabled={busyId === u.id}
                  onPress={() => sendRequest(u.id)}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </Row>
            ))
          )
        ) : seg === "Friends" ? (
          friends.length === 0 ? (
            <Text style={styles.empty}>No friends yet. Search to add explorers!</Text>
          ) : (
            friends.map((f) => (
              <Row key={f.id} user={f} onPress={() => router.push(`/profile/${f.id}`)}>
                <Icon name="chevron-right" size={24} color={colors.textMuted} />
              </Row>
            ))
          )
        ) : requests.length === 0 ? (
          <Text style={styles.empty}>No incoming requests.</Text>
        ) : (
          requests.map((req) => (
            <Row key={req.id} user={req.user} onPress={() => router.push(`/profile/${req.user.id}`)}>
              <View style={styles.respondRow}>
                <Pressable
                  style={styles.acceptBtn}
                  disabled={busyId === req.id}
                  onPress={() => respond(req, "accept")}
                >
                  <Icon name="check" size={20} color={colors.onPrimary} />
                </Pressable>
                <Pressable
                  style={styles.rejectBtn}
                  disabled={busyId === req.id}
                  onPress={() => respond(req, "reject")}
                >
                  <Icon name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            </Row>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  user,
  onPress,
  children,
}: {
  user: UserSummary;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar uri={user.avatarUrl ?? ""} size={48} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{user.username}</Text>
        {user.bio ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>
      {children}
    </Pressable>
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.surfaceLowest,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  segmentRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { ...typography.badge, color: colors.textMuted },
  segmentTextActive: { color: colors.onPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm, paddingTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  rowBody: { flex: 1 },
  rowName: { ...typography.body, fontWeight: "600" },
  rowMeta: { ...typography.caption },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primary },
  addBtnText: { ...typography.badge, color: colors.onPrimary },
  respondRow: { flexDirection: "row", gap: spacing.sm },
  acceptBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { ...typography.caption, textAlign: "center", paddingVertical: spacing.xl },
});
