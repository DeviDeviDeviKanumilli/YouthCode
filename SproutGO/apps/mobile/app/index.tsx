// Root index: the gate in _layout.tsx redirects based on session, but expo-router
// needs a component at "/" for the brief moment before redirect.
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/theme";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
