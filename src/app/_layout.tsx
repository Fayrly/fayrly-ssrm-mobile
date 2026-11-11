import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from '@/lib/auth';
import { c } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  return (
    <AuthProvider>
      <RootGate fontsLoaded={fontsLoaded} />
    </AuthProvider>
  );
}

function RootGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready } = useAuth();

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="events/[slug]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="events/[slug]/tiket" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="masuk" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="daftar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="lupa-password" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
