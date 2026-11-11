import { AuthShell } from '@/components/auth-shell';
import { Button, ErrorBanner, Field } from '@/components/ui';
import { ApiError, requestPasswordReset, resetPassword, verifyResetCode } from '@/lib/api';
import { c, f, radius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Step = 'confirm' | 'otp' | 'password' | 'done';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('confirm');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submitEmail = async () => {
    if (loading) {
      return;
    }
    setError(null);
    setNotice(null);
    const trimmed = email.trim();
    setEmail(trimmed);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(trimmed);
      setCooldown(60);
      setStep('otp');
    } catch (cause) {
      setError(emailError(cause));
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (loading) {
      return;
    }
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(code)) {
      setError('Kode OTP terdiri dari 6 angka.');
      return;
    }
    setLoading(true);
    try {
      await verifyResetCode(email, code);
      setCooldown(0);
      setStep('password');
    } catch (cause) {
      setError(otpError(cause));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async () => {
    if (loading) {
      return;
    }
    setError(null);
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
      await resetPassword(email, code, password);
      setPassword('');
      setConfirmation('');
      setStep('done');
    } catch (cause) {
      setError(resetError(cause));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resending || cooldown > 0) {
      return;
    }
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await requestPasswordReset(email);
      setCode('');
      setNotice('Kode baru sudah dikirim. Periksa kotak masuk dan folder spam.');
      setCooldown(60);
    } catch (cause) {
      setError(emailError(cause));
    } finally {
      setResending(false);
    }
  };

  if (step === 'done') {
    return (
      <AuthShell
        title="Kata sandi diperbarui"
        subtitle="Kamu bisa masuk kembali menggunakan kata sandi yang baru."
      >
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={26} color={c.mint700} />
          </View>
          <Text style={styles.doneText}>
            Kata sandi untuk {email} sudah diganti. Sesi lama yang masih aktif tidak lagi
            menggunakan kata sandi lama.
          </Text>
          <Button
            label="Masuk dengan kata sandi baru"
            onPress={() => router.replace('/masuk')}
            style={styles.stretch}
          />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      step={{ current: step === 'confirm' ? 1 : step === 'otp' ? 2 : 3, total: 3 }}
      title={step === 'confirm' ? 'Lupa kata sandi' : step === 'otp' ? 'Periksa email kamu' : 'Kata sandi baru'}
      subtitle={
        step === 'confirm'
          ? 'Masukkan email akun Fayrly. Kami akan mengirim kode OTP 6 angka untuk memulihkan akun.'
          : step === 'otp'
            ? `Kode 6 angka dikirim ke ${email}. Masukkan kode itu di bawah untuk melanjutkan.`
            : 'Buat kata sandi baru minimal 8 karakter dan memuat huruf serta angka.'
      }
    >
      {step === 'confirm' ? (
        <>
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
            returnKeyType="go"
            onSubmitEditing={submitEmail}
          />
          {error ? <ErrorBanner message={error} /> : null}
          <Button label="Kirim kode OTP" onPress={submitEmail} loading={loading} />
        </>
      ) : null}

      {step === 'otp' ? (
        <>
          <Field
            label="Kode OTP"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6 angka"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={submitCode}
          />
          {error ? <ErrorBanner message={error} /> : null}
          {notice ? (
            <View style={styles.notice}>
              <Ionicons name="mail-outline" size={15} color={c.mint700} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}
          <Button label="Verifikasi kode" onPress={submitCode} loading={loading} />
          <Pressable
            onPress={resend}
            hitSlop={8}
            disabled={cooldown > 0 || resending}
            accessibilityRole="button"
            style={({ pressed }) => [styles.center, pressed && styles.pressed]}
          >
            <Text style={[styles.link, cooldown > 0 && styles.linkMuted]}>
              {resending
                ? 'Mengirim ulang…'
                : cooldown > 0
                  ? `Kirim ulang kode dalam ${cooldown} detik`
                  : 'Kirim ulang kode'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStep('confirm');
              setCode('');
              setError(null);
              setNotice(null);
              setCooldown(0);
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.center, pressed && styles.pressed]}
          >
            <Text style={styles.subLink}>Ubah email</Text>
          </Pressable>
        </>
      ) : null}

      {step === 'password' ? (
        <>
          <Field
            label="Kata sandi baru"
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
            label="Ulangi kata sandi baru"
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Ketik ulang kata sandi"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={72}
            returnKeyType="go"
            onSubmitEditing={submitPassword}
          />
          {error ? <ErrorBanner message={error} /> : null}
          <Button label="Simpan kata sandi" onPress={submitPassword} loading={loading} />
          <Pressable
            onPress={() => {
              setStep('otp');
              setPassword('');
              setConfirmation('');
              setError(null);
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.center, pressed && styles.pressed]}
          >
            <Text style={styles.subLink}>Kembali ke kode OTP</Text>
          </Pressable>
        </>
      ) : null}
    </AuthShell>
  );
}

function emailError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Tunggu sebentar sebelum meminta kode lagi.';
    }
    if (error.status === 422) {
      return 'Email tidak valid. Periksa kembali alamat emailmu.';
    }
    if (error.status === 503) {
      return 'Pengiriman email reset sedang tidak tersedia. Coba lagi nanti.';
    }
    if (error.status === 0) {
      return error.message;
    }
    if (error.status >= 500) {
      return 'Server sedang bermasalah. Coba lagi sebentar.';
    }
  }
  return 'Tidak dapat terhubung ke server. Periksa koneksimu.';
}

function otpError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Kode OTP salah atau sudah kedaluwarsa.';
    }
    if (error.status === 429) {
      return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
    }
    if (error.status === 0) {
      return error.message;
    }
    if (error.status >= 500) {
      return 'Server sedang bermasalah. Coba lagi sebentar.';
    }
  }
  return 'Kode tidak dapat diverifikasi. Coba lagi.';
}

function resetError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Kode OTP sudah tidak berlaku. Ulangi dari langkah verifikasi.';
    }
    if (error.status === 422) {
      return 'Kata sandi belum memenuhi syarat. Periksa kembali.';
    }
    if (error.status === 0) {
      return error.message;
    }
    if (error.status >= 500) {
      return 'Server sedang bermasalah. Coba lagi sebentar.';
    }
  }
  return 'Kata sandi tidak dapat disimpan. Coba lagi.';
}

const styles = StyleSheet.create({
  center: {
    alignSelf: 'center',
    paddingVertical: 2,
  },
  link: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.mint700,
  },
  linkMuted: {
    color: c.soft,
  },
  subLink: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.muted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 11,
    borderRadius: radius.sm,
    backgroundColor: c.mint50,
  },
  noticeText: {
    flex: 1,
    fontFamily: f.regular,
    fontSize: 11,
    lineHeight: 17,
    color: c.mint700,
  },
  done: {
    gap: 14,
    alignItems: 'flex-start',
  },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    color: c.muted,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
});
