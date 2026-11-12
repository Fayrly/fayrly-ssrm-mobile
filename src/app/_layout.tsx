import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppVisibleContext } from '@/lib/app-visibility';
import { BrandSplash } from '@/components/brand-splash';
import { c } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const SPLASH_MIN_MS = 500;
const SPLASH_FADE_DELAY_MS = 80;
const SPLASH_FADE_MS = 220;

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
  const { ready, user } = useAuth();
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [splashOpacity] = useState(() => new Animated.Value(1));

  const appReady = fontsLoaded && ready;

  useEffect(() => {
    const timer = setTimeout(() => setSplashElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

  useEffect(() => {
    if (!appReady || !splashElapsed) {
      return;
    }
    const animation = Animated.sequence([
      Animated.delay(SPLASH_FADE_DELAY_MS),
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: SPLASH_FADE_MS,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        setSplashGone(true);
      }
    });
    return () => animation.stop();
  }, [appReady, splashElapsed, splashOpacity]);

  if (!appReady) {
    return <BrandSplash />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppVisibleContext.Provider value={splashGone}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.canvas },
          }}
        >
          <Stack.Protected guard={!user}>
            <Stack.Screen name="masuk" options={{ animation: 'none' }} />
            <Stack.Screen name="daftar" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="lupa-password" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>

          <Stack.Protected guard={Boolean(user)}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="events/[slug]/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/[slug]/tiket" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/[slug]/checkout" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
        </Stack>
      </AppVisibleContext.Provider>

      {!splashGone ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.splashOverlay, { opacity: splashOpacity }]}
        >
          <BrandSplash />
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
