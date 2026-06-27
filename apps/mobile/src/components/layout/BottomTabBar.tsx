import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  navigation: {
    navigate: (name: string) => void;
  };
};

const iconByRoute: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  index: 'map',
  watch: 'search',
  sightings: 'feed',
  profile: 'menu-book',
};

const labelByRoute: Record<string, string> = {
  index: 'Explore',
  watch: 'Watch',
  sightings: 'Sightings',
  profile: 'Guide',
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => route.name !== 'report');
  const firstRoutes = routes.slice(0, 2);
  const lastRoutes = routes.slice(2);

  function renderRoute(route: { key: string; name: string }) {
    const routeStateIndex = state.routes.findIndex((candidate) => candidate.key === route.key);
    const focused = state.index === routeStateIndex;
    const color = focused ? colors.moss : '#8A8C90';
    const routeName = route.name;

    return (
      <View key={route.key} style={styles.routeSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={focused ? { selected: true } : {}}
          onPress={() => navigation.navigate(route.name as never)}
          style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
          <MaterialIcons
            name={iconByRoute[routeName] ?? 'help-outline'}
            size={24}
            color={color}
          />
          <Text style={[styles.label, { color, fontFamily: focused ? fonts.bodySemibold : fonts.label }]}>
            {labelByRoute[routeName] ?? routeName}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {firstRoutes.map(renderRoute)}
      <View style={styles.routeSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New sighting"
          onPress={() => navigation.navigate('report' as never)}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <MaterialIcons name="add" size={30} color={colors.white} />
        </Pressable>
      </View>
      {lastRoutes.map(renderRoute)}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(252, 250, 244, 0.96)',
    borderTopColor: colors.outline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 16,
    elevation: 16,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 14,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  routeSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 66,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.blue,
    borderWidth: 6,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: colors.blue,
    shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
