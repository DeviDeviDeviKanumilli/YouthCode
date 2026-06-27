import { useState } from "react";
import { Link } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { colors, spacing, radius, typography } from "@/theme";

// 13+ gate (SECURITY_AND_PRIVACY §audience). MVP is 13+ only — no COPPA scope.
function isAtLeast13(dob: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(y, mo - 1, d);
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 13);
  return birth <= cutoff;
}

export default function Signup() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!isAtLeast13(dob)) {
      setError("You must be at least 13 years old to use SproutGo. Enter your birth date as YYYY-MM-DD.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim(), password, dob.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign up");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Text style={styles.wordmark}>SproutGo</Text>
      <Text style={typography.largeTitle}>Create your account</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Start your nature journal. You must be 13 or older.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={styles.input}
        placeholder="Birth date (YYYY-MM-DD)"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        value={dob}
        onChangeText={setDob}
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? "Creating…" : "Sign up"}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" style={styles.link}>
        <Text style={typography.caption}>Already have an account? Log in</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: "center" },
  wordmark: { ...typography.sectionTitle, color: colors.primary, marginBottom: spacing.xl },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.sage,
    borderWidth: 1,
    borderRadius: radius.button,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.textInverse, fontSize: 16, fontWeight: "600" },
  link: { marginTop: spacing.lg, alignItems: "center" },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
