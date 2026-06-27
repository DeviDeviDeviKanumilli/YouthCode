// Thin wrapper over MaterialIcons so screens reference semantic names and a single
// import. The Stitch mockups use Material Symbols; MaterialIcons is the closest
// JS-only font (no native rebuild), so glyphs map 1:1 by kebab-case name.
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { colors } from "@/theme";

export type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

export function Icon({
  name,
  size = 24,
  color = colors.textMuted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}
