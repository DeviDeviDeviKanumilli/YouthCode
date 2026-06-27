import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import {
  Epilogue_400Regular,
  Epilogue_500Medium,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { colors } from '@/theme/colors';
import { LocationProvider } from '@/location/LocationProvider';
import { SystemStatusProvider } from '@/system/SystemStatusProvider';
import { UserProvider } from '@/user/UserProvider';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Epilogue_400Regular,
    Epilogue_500Medium,
    Epilogue_600SemiBold,
    Epilogue_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SystemStatusProvider>
        <UserProvider>
          <LocationProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="watch/item/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="watch/place/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="sightings/[id]" options={{ headerShown: false }} />
            </Stack>
          </LocationProvider>
        </UserProvider>
      </SystemStatusProvider>
    </GestureHandlerRootView>
  );
}
