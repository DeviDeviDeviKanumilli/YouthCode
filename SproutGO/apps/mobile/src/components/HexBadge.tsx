// Hexagonal badge — the signature "collectible" shape from the Stitch PlantDex grid
// and the discovery reward screen. A rarity-colored hex frames a clipped plant photo;
// the locked variant shows a question mark on a muted hex.
import { View, Image, StyleSheet } from "react-native";
import Svg, { Polygon, Defs, ClipPath } from "react-native-svg";
import { colors } from "@/theme";
import { Icon } from "@/components/Icon";
import type { Rarity } from "@/lib/mockData";

// Flat-top hexagon points normalized to a 100x86 viewBox (Stitch clip-path ratio).
const HEX = "50,0 100,25 100,75 50,100 0,75 0,25";

export function HexBadge({
  imageUrl,
  rarity,
  locked = false,
  size = 124,
}: {
  imageUrl: string | null;
  rarity: Rarity;
  locked?: boolean;
  size?: number;
}) {
  const h = size * 0.86;
  const ring = locked ? colors.outlineVariant : colors.rarity[rarity];
  const inset = 5;

  return (
    <View style={{ width: size, height: h }}>
      {/* Rarity ring */}
      <Svg width={size} height={h} viewBox="0 0 100 86" style={StyleSheet.absoluteFill}>
        <Polygon points={HEX} fill={ring} />
      </Svg>
      {/* Inner clipped content */}
      <View style={{ position: "absolute", top: inset, left: inset, right: inset, bottom: inset }}>
        {locked || !imageUrl ? (
          <View style={[styles.lockedInner, { backgroundColor: colors.surfaceContainer }]}>
            <HexClip size={size - inset * 2}>
              <View style={styles.lockFill}>
                <Icon name="help-outline" size={36} color={colors.outlineVariant} />
              </View>
            </HexClip>
          </View>
        ) : (
          <HexClip size={size - inset * 2}>
            <Image source={{ uri: imageUrl }} style={styles.fill} resizeMode="cover" />
          </HexClip>
        )}
      </View>
    </View>
  );
}

function HexClip({ size, children }: { size: number; children: React.ReactNode }) {
  const h = size * 0.86;
  return (
    <View style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 100 86" style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id="hexclip">
            <Polygon points={HEX} />
          </ClipPath>
        </Defs>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.clipped]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  clipped: { overflow: "hidden", borderRadius: 8 },
  lockedInner: { flex: 1 },
  lockFill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceContainer },
});
