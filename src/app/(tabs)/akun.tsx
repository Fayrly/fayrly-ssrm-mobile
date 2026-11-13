import { Avatar, Button, PageHeader, Screen, Sheet } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { c, f, hairline, radius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ROLE_LABEL: Record<string, string> = {
  member: 'Peserta',
  manager: 'Penyelenggara',
  staff: 'Staf',
  admin: 'Admin',
  superadmin: 'Superadmin',
};

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setConfirmOpen(false);
  };

  if (!user) {
    return (
      <Screen>
        <PageHeader
          heading="Masuk ke Fayrly"
          subtitle="Simpan event, tulis ulasan, dan kelola tiket dalam satu akun."
        />
        <View style={styles.guestCard}>
          <View style={styles.guestIcon}>
            <Ionicons name="person-outline" size={30} color={c.mint700} />
          </View>
          <Text style={styles.guestTitle}>Kamu belum masuk</Text>
          <Text style={styles.guestBody}>
            Masuk dengan akun Fayrly untuk melanjutkan pemesanan tiket dan menulis ulasan.
          </Text>
          <Button
            label="Masuk"
            icon="log-in-outline"
            onPress={() => router.push('/masuk')}
            style={styles.guestButton}
          />
          <Button
            label="Buat akun baru"
            variant="ghost"
            onPress={() => router.push('/daftar')}
            style={styles.guestButton}
          />
          <Pressable
            onPress={() => router.push('/lupa-password')}
            hitSlop={8}
            accessibilityRole="link"
            style={({ pressed }) => [styles.quietLink, pressed && styles.pressed]}
          >
            <Text style={styles.quietLinkText}>Lupa kata sandi?</Text>
          </Pressable>
        </View>
        <Text style={styles.version}>Fayrly versi {version}</Text>
      </Screen>
    );
  }

  const role = user.roles?.[0];

  return (
    <Screen>
      <PageHeader heading="Profil kamu" />
      <View style={styles.profile}>
        <Avatar name={user.name} size={64} />
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {role ? (
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{ROLE_LABEL[role.toLowerCase()] ?? role}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="shield-checkmark-outline" size={18} color={c.mint700} />
            <Text style={styles.rowLabel}>Status akun</Text>
          </View>
          <Text style={styles.rowValue}>{user.status === 'active' ? 'Aktif' : 'Tidak aktif'}</Text>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.rowLeft}>
            <Ionicons name="ticket-outline" size={18} color={c.mint700} />
            <Text style={styles.rowLabel}>Tiket saya</Text>
          </View>
          <View style={styles.soonTag}>
            <Text style={styles.soonText}>Segera hadir</Text>
          </View>
        </View>
      </View>
      <Text style={styles.groupNote}>
        Riwayat tiket belum tersedia karena backend Fayrly belum menyimpan pesanan tiket.
      </Text>

      <View style={styles.actions}>
        <Button
          label="Keluar dari akun"
          variant="ghost"
          icon="log-out-outline"
          onPress={() => setConfirmOpen(true)}
          style={styles.logout}
        />
      </View>

      <Text style={styles.version}>Fayrly versi {version}</Text>

      <Sheet visible={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <Text style={styles.sheetTitle}>Keluar dari akun?</Text>
        <Text style={styles.sheetBody}>
          Kamu perlu masuk lagi untuk melanjutkan pemesanan atau menulis ulasan.
        </Text>
        <View style={styles.sheetActions}>
          <Button
            label="Ya, keluar"
            onPress={handleLogout}
            loading={loggingOut}
            style={styles.sheetButton}
          />
          <Button
            label="Batal"
            variant="quiet"
            onPress={() => setConfirmOpen(false)}
            style={styles.sheetButton}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 22,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    alignItems: 'flex-start',
    gap: 10,
  },
  guestIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.mint50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guestTitle: {
    fontFamily: f.semibold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: c.ink,
  },
  guestBody: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    color: c.muted,
  },
  guestButton: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
  quietLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 2,
  },
  quietLinkText: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.mint700,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 22,
    borderBottomWidth: hairline,
    borderBottomColor: c.line,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontFamily: f.semibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: c.ink,
  },
  profileEmail: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.muted,
  },
  roleTag: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: c.mint50,
  },
  roleTagText: {
    fontFamily: f.semibold,
    fontSize: 10,
    color: c.mint700,
  },
  group: {
    marginTop: 20,
    borderTopWidth: hairline,
    borderBottomWidth: hairline,
    borderColor: c.line,
    backgroundColor: c.paper,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: hairline,
    borderTopColor: c.line,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontFamily: f.medium,
    fontSize: 13,
    color: c.ink,
  },
  rowValue: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.muted,
  },
  soonTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: c.wash,
  },
  soonText: {
    fontFamily: f.medium,
    fontSize: 10,
    color: c.muted,
  },
  groupNote: {
    fontFamily: f.regular,
    fontSize: 11,
    lineHeight: 17,
    color: c.soft,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actions: {
    paddingHorizontal: 20,
    marginTop: 26,
  },
  logout: {
    borderColor: c.crimson,
  },
  version: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
    textAlign: 'center',
    marginTop: 'auto',
    paddingVertical: 18,
  },
  pressed: {
    opacity: 0.7,
  },
  sheetTitle: {
    fontFamily: f.semibold,
    fontSize: 19,
    letterSpacing: -0.3,
    color: c.ink,
  },
  sheetBody: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    color: c.muted,
    marginTop: 6,
  },
  sheetActions: {
    gap: 8,
    marginTop: 18,
  },
  sheetButton: {
    alignSelf: 'stretch',
  },
});
