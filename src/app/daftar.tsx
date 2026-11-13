import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthShell } from '@/components/auth-shell';
import { Button, Field, NoticeModal } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNext } from '@/lib/navigation';
import { useThemeMode, type ThemeMode } from '@/lib/theme-mode';
import { c as light, f, dark, type Colors } from '@/theme';

export default function RegisterScreen() {
  const { styles } = useSignUpTheme();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const destination = safeNext(next);

  const submit = async () => {
    if (loading) {
      return;
    }
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setError('Nama minimal 2 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (trimmedPhone.length > 32) {
      setError('Nomor telepon maksimal 32 karakter.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password.length > 72) {
      setError('Kata sandi maksimal 72 karakter.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Kata sandi harus memuat huruf dan angka.');
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phone: trimmedPhone || undefined,
      });
    } catch (cause) {
      setError(registerError(cause));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Buat akun Fayrly"
      subtitle="Satu akun untuk menjelajah event, memesan tiket, dan menulis ulasan."
    >
      <Field
        label="Nama lengkap"
        value={name}
        onChangeText={setName}
        placeholder="Nama yang tampil di ulasan"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={120}
        returnKeyType="next"
      />
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
        label="Nomor telepon (opsional)"
        value={phone}
        onChangeText={setPhone}
        placeholder="08xxxxxxxxxx"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={32}
        returnKeyType="next"
      />
      <Field
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimal 8 karakter, huruf dan angka"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        returnKeyType="next"
      />
      <Field
        label="Ulangi kata sandi"
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Ketik ulang kata sandi"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button label="Daftar" onPress={submit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Sudah punya akun?</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/', params: destination ? { next: destination } : {} })
          }
          hitSlop={8}
          accessibilityRole="link"
        >
          <Text style={styles.footerLink}>Masuk di sini</Text>
        </Pressable>
      </View>

      <Text style={styles.legal}>
        Dengan mendaftar, kamu setuju memakai data akun hanya untuk keperluan event di Fayrly.
      </Text>

      <NoticeModal
        title="Pendaftaran belum berhasil"
        message={error}
        onClose={() => setError(null)}
      />
    </AuthShell>
  );
}

function registerError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'Email ini sudah terdaftar. Coba masuk dengan akun tersebut.';
    }
    if (error.status === 429) {
      return 'Terlalu banyak percobaan. Coba lagi nanti.';
    }
    if (error.status === 422) {
      return 'Pendaftaran tidak dapat diproses. Periksa kembali data yang kamu isi.';
    }
    if (error.status === 0) {
      return error.message;
    }
    if (error.status >= 500) {
      return 'Server sedang bermasalah. Coba lagi sebentar.';
    }
    return 'Pendaftaran tidak dapat diproses. Periksa data kamu lalu coba lagi.';
  }
  return 'Tidak dapat terhubung ke server. Periksa koneksimu.';
}

function buildStyles(c: Colors) {
  return StyleSheet.create({
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
      marginTop: 4,
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
    legal: {
      fontFamily: f.regular,
      fontSize: 10,
      lineHeight: 16,
      color: c.soft,
      textAlign: 'center',
      marginTop: 4,
    },
  });
}

const stylesByMode: Record<ThemeMode, ReturnType<typeof buildStyles>> = {
  light: buildStyles(light),
  dark: buildStyles(dark),
};

function useSignUpTheme() {
  const { mode, colors } = useThemeMode();
  return { mode, c: colors, styles: stylesByMode[mode] };
}
