import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/layout/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="watch" options={{ title: 'Watch' }} />
      <Tabs.Screen name="report" options={{ title: 'New sighting', tabBarButton: () => null }} />
      <Tabs.Screen name="sightings" options={{ title: 'Sightings' }} />
      <Tabs.Screen name="profile" options={{ title: 'Guide' }} />
    </Tabs>
  );
}
