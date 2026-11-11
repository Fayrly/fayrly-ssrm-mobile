import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthShell } from '@/components/auth-shell';
import { Button, ErrorBanner, Field } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNext } from '@/lib/navigation';
import { c, f } from '@/theme';

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const destination = safeNext(next);

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
      if (destination) {
        router.replace(destination as Href);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (cause) {
      setError(loginError(cause));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Selamat datang kembali"
      subtitle="Masuk dengan akun Fayrly yang sama seperti di web untuk melanjutkan."
    >
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

      {error ? <ErrorBanner message={error} /> : null}

      <Button label="Masuk" onPress={submit} loading={loading} />

      <Pressable
        onPress={() => router.push({ pathname: '/lupa-password' })}
        hitSlop={8}
        accessibilityRole="link"
        style={({ pressed }) => [styles.center, pressed && styles.pressed]}
      >
        <Text style={styles.link}>Lupa kata sandi?</Text>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Belum punya akun Fayrly?</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/daftar', params: destination ? { next: destination } : {} })
          }
          hitSlop={8}
          accessibilityRole="link"
        >
          <Text style={styles.footerLink}>Daftar sekarang</Text>
        </Pressable>
      </View>
    </AuthShell>
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
  center: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  link: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.mint700,
  },
  divider: {
    height: 1,
    backgroundColor: c.line,
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.muted,
  },
  footerLink: {
    fontFamily: f.semibold,
    fontSize: 12,
    color: c.mint700,
  },
  pressed: {
    opacity: 0.7,
  },
});
