// Plant chat (design Plant Chat) — converse with a discovered plant's persona. Loads the
// plant header (GET /library/:id) + conversation history (GET /chat/:id), and sends messages
// to POST /chat/:id. Chat is PlantDex-gated server-side: a 403 shows a "discover first" state.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatHistoryResponse, ChatReply, ChatTurn, PlantDetailResponse } from "@sproutgo/shared";
import { colors, spacing, radius, typography } from "@/theme";
import { Icon } from "@/components/Icon";
import { api, ApiClientError } from "@/lib/api";

const SUGGESTIONS = [
  "Where do you like to grow?",
  "What makes you special?",
  "How can I take care of you?",
  "Who are your plant neighbors?",
];

export default function PlantChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState("Plant");
  const [scientific, setScientific] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLocked(false);
    // Plant header is not gated; history is (403 when undiscovered).
    Promise.allSettled([
      api.get<PlantDetailResponse>(`/library/${id}`),
      api.get<ChatHistoryResponse>(`/chat/${id}`),
    ]).then(([plantRes, histRes]) => {
      if (cancelled) return;
      if (plantRes.status === "fulfilled") {
        setName(plantRes.value.plant.commonName ?? plantRes.value.plant.scientificName);
        setScientific(plantRes.value.plant.scientificName);
      }
      if (histRes.status === "fulfilled") {
        setMessages(histRes.value.messages);
      } else if (histRes.reason instanceof ApiClientError && histRes.reason.status === 403) {
        setLocked(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(load, [load]);

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || sending) return;
      const now = new Date().toISOString();
      setMessages((cur) => [...cur, { role: "user", content: message, createdAt: now }]);
      setDraft("");
      setSending(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      api
        .post<ChatReply>(`/chat/${id}`, { message })
        .then((r) =>
          setMessages((cur) => [...cur, { role: "plant", content: r.reply, createdAt: new Date().toISOString() }]),
        )
        .catch((e) => {
          const msg =
            e instanceof ApiClientError
              ? e.status === 429
                ? "I need a moment to catch my breath — try again shortly."
                : e.message
              : "I couldn't respond just now. Please try again.";
          setMessages((cur) => [...cur, { role: "plant", content: msg, createdAt: new Date().toISOString() }]);
        })
        .finally(() => {
          setSending(false);
          requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
        });
    },
    [id, sending],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.circleBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{name}</Text>
          {scientific ? <Text style={typography.scientificName}>{scientific}</Text> : null}
        </View>
        <View style={styles.guideBadge}>
          <Icon name="eco" size={20} color={colors.primaryContainer} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : locked ? (
        <View style={styles.lockedWrap}>
          <Icon name="lock" size={36} color={colors.outlineVariant} />
          <Text style={styles.lockedText}>
            Discover {name} in the wild to unlock a conversation with it.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
            <View style={styles.introBadge}>
              <Icon name="eco" size={15} color={colors.primaryContainer} />
              <Text style={styles.introText}>You're chatting with {name}</Text>
            </View>

            {messages.length === 0 ? (
              <Text style={styles.emptyHint}>Say hello, or tap a suggestion below.</Text>
            ) : (
              messages.map((m, i) => {
                const mine = m.role === "user";
                return (
                  <View key={`${m.createdAt}-${i}`} style={[styles.row, mine ? styles.rowEnd : styles.rowStart]}>
                    <View style={{ maxWidth: "85%" }}>
                      <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubblePlant]}>
                        <Text style={[typography.body, mine && { color: colors.onPrimary }]}>{m.content}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
            {sending ? (
              <View style={[styles.row, styles.rowStart]}>
                <View style={[styles.bubble, styles.bubblePlant]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestChip} onPress={() => setDraft(s)}>
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={`Ask ${name}…`}
                placeholderTextColor={colors.outline}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <Pressable
                style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}
                onPress={() => send(draft)}
                disabled={!draft.trim() || sending}
              >
                <Icon name="send" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceLowest },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 64,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { ...typography.sectionTitle, color: colors.primary },
  guideBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  lockedText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 300 },
  messages: { padding: spacing.md, gap: spacing.lg },
  introBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  introText: { ...typography.caption, color: colors.textMuted },
  emptyHint: { ...typography.caption, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg },
  row: { width: "100%", flexDirection: "row" },
  rowStart: { justifyContent: "flex-start" },
  rowEnd: { justifyContent: "flex-end" },
  bubble: { padding: spacing.md, borderRadius: 20 },
  bubblePlant: { backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.sage, borderTopLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  suggestRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  suggestChip: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestText: { ...typography.caption, color: colors.textMuted },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.sheet,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    maxHeight: 120,
  },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
