import { SPLASH_LOGO_HEIGHT, SPLASH_LOGO_WIDTH } from '@/components/brand-splash';
import { Button, ErrorBanner, Field } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAppVisible } from '@/lib/app-visibility';
import { useAuth } from '@/lib/auth';
import { safeNext } from '@/lib/navigation';
import { c, f, radius } from '@/theme';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO_GAP = 62;
const CARD_GAP = 40;

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { login } = useAuth();
  const appVisible = useAppVisible();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [rise] = useState(() => new Animated.Value(0));
  const [card] = useState(() => new Animated.Value(0));

  const destination = safeNext(next);

  const logoTop = insets.top + LOGO_GAP;
  const cardTop = logoTop + SPLASH_LOGO_HEIGHT + CARD_GAP;
  const logoStart = height / 2 - 15 - (logoTop + SPLASH_LOGO_HEIGHT / 2);

  useEffect(() => {
    if (!appVisible) {
      return;
    }
    const driver = Platform.OS !== 'web';
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(rise, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: driver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(380),
        Animated.timing(card, {
          toValue: 1,
          duration: 780,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: driver,
        }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [appVisible, rise, card]);

  const logoTranslateY = rise.interpolate({
    inputRange: [0, 1],
    outputRange: [logoStart, 0],
  });
  const cardTranslateY = card.interpolate({
    inputRange: [0, 1],
    outputRange: [height - cardTop + 24, 0],
  });

  const submit = async () => {
    if (loading) {
      return;
    }
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (!password) {
      setError('Kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      await login(trimmed, password);
    } catch (cause) {
      setError(loginError(cause));
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />



      <Animated.View
        pointerEvents="none"
        style={[styles.logoWrap, { top: logoTop, transform: [{ translateY: logoTranslateY }] }]}
      >
        <Image
          source={require('../../assets/images/splash-logo-light.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Fayrly"
        />
      </Animated.View>

      <Animated.View style={[styles.card, { top: cardTop, transform: [{ translateY: cardTranslateY }] }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.cardContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title} accessibilityRole="header">
              Selamat datang kembali
            </Text>

            <View style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                returnKeyType="next"
              />
              <Field
                label="Kata sandi"
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan kata sandi"
                secure
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              <Pressable
                onPress={() => router.push({ pathname: '/lupa-password' })}
                hitSlop={10}
                accessibilityRole="link"
                style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
              >
                <Text style={styles.forgotText}>Lupa kata sandi?</Text>
              </Pressable>

              {error ? <ErrorBanner message={error} /> : null}

              <Button label="Masuk" onPress={submit} loading={loading} />
              {/* <Pressable
                onPress={() => router.push({ pathname: '/lupa-password' })}
                hitSlop={10}
                accessibilityRole="link"
                style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
              >
                <Text style={styles.forgotText}>Belum Punya Akun?</Text>
              </Pressable> */}
            </View>

            <View>
              <Text style={styles.orUse} accessibilityRole="header">
              Atau Gunakan
            </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

function loginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Email atau kata sandi salah.';
    }
    if (error.status === 429) {
      return 'Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.';
    }
    if (error.status === 422) {
      return 'Periksa kembali email dan kata sandi kamu.';
    }
    if (error.status === 0) {
      return error.message;
    }
    if (error.status >= 500) {
      return 'Server sedang bermasalah. Coba lagi sebentar.';
    }
    return error.message;
  }
  return 'Tidak dapat terhubung ke server. Periksa koneksimu.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.mint700,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  topBarLabel: {
    fontFamily: f.medium,
    fontSize: 11,
    color: c.mint100,
  },
  topBarAction: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.mint200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarActionText: {
    fontFamily: f.semibold,
    fontSize: 11,
    color: c.paper,
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    width: SPLASH_LOGO_WIDTH,
    height: SPLASH_LOGO_HEIGHT,
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    shadowColor: '#0A2A20',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  title: {
    fontFamily: f.bold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.7,
    color: c.ink,
  },
  subtitle: {
    fontFamily: f.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: c.muted,
    marginTop: 6,
    maxWidth: 340,
  },
  form: {
    marginTop: 22,
    gap: 14,
  },
  forgot: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6
  },
  forgotText: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.mint700,
  },
  pressed: {
    opacity: 0.7,
  },
  createAkun: {
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
  },
  orUse: {
    alignSelf: 'center',
    fontFamily: f.medium,
    fontSize: 13,
    marginTop: 50
  }
});
