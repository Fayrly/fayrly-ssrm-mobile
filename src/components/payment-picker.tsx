import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, Field, Sheet } from '@/components/ui';
import { c, f, hairline, radius } from '@/theme';

export type PaymentChoice =
  | { method: 'bank'; bank: string }
  | { method: 'qris' }
  | { method: 'gopay' };

// Name suggestions only, not a payment provider's supported-bank catalog.
const banks = [
  { name: 'BCA', aliases: ['Bank Central Asia'], logo: require('../../assets/images/payments/bca.png') },
  { name: 'Mandiri', aliases: ['Bank Mandiri'], logo: require('../../assets/images/payments/mandiri.png') },
  { name: 'BRI', aliases: ['Bank Rakyat Indonesia'], logo: require('../../assets/images/payments/bri.png') },
  { name: 'BNI', aliases: ['Bank Negara Indonesia'], logo: require('../../assets/images/payments/bni.png') },
  { name: 'BSI', aliases: ['Bank Syariah Indonesia'], logo: require('../../assets/images/payments/bsi.png') },
  { name: 'BTN', aliases: ['Bank Tabungan Negara'], logo: require('../../assets/images/payments/btn.png') },
  { name: 'CIMB Niaga', aliases: ['Bank CIMB Niaga', 'Niaga'], logo: require('../../assets/images/payments/cimb-niaga.png') },
  { name: 'Permata', aliases: ['Bank Permata', 'PermataBank'], logo: require('../../assets/images/payments/permata.png') },
  { name: 'Danamon', aliases: ['Bank Danamon Indonesia'], logo: require('../../assets/images/payments/danamon.png') },
  { name: 'OCBC', aliases: ['Bank OCBC NISP', 'NISP'], logo: require('../../assets/images/payments/ocbc.png') },
  { name: 'Maybank', aliases: ['Bank Maybank Indonesia', 'BII'], logo: require('../../assets/images/payments/maybank.png') },
  { name: 'Panin', aliases: ['Bank Panin', 'PaninBank'], logo: require('../../assets/images/payments/panin.png') },
  { name: 'Bank Mega', aliases: ['Mega'], logo: require('../../assets/images/payments/mega.png') },
  { name: 'Bank Jago', aliases: ['Jago'], logo: require('../../assets/images/payments/jago.png') },
  { name: 'SeaBank', aliases: ['Sea Bank', 'Bank Seabank Indonesia'], logo: require('../../assets/images/payments/seabank.png') },
  { name: 'Bank Jatim', aliases: ['Jatim', 'Bank Jawa Timur', 'BPD Jawa Timur'], logo: require('../../assets/images/payments/jatim.png') },
  { name: 'Bank Jakarta (DKI)', aliases: ['Bank DKI', 'DKI', 'Bank Jakarta', 'Jakarta'], logo: require('../../assets/images/payments/dki.png') },
  { name: 'Bank BJB', aliases: ['BJB', 'Bank Jawa Barat Banten', 'Bank Jabar Banten'], logo: require('../../assets/images/payments/bjb.png') },
  { name: 'Bank Jateng', aliases: ['Jateng', 'Bank Jawa Tengah', 'BPD Jawa Tengah'], logo: require('../../assets/images/payments/jateng.png') },
  { name: 'Bank DIY', aliases: ['DIY', 'BPD DIY', 'Yogyakarta'], logo: require('../../assets/images/payments/diy.png') },
  { name: 'Bank Sumut', aliases: ['Sumut', 'Bank Sumatera Utara'], logo: require('../../assets/images/payments/sumut.png') },
  { name: 'Bank Nagari', aliases: ['Nagari', 'BPD Sumatera Barat'], logo: require('../../assets/images/payments/nagari.png') },
];

const methods = [
  { method: 'bank', title: 'Transfer bank' },
  { method: 'qris', title: 'QRIS', logo: require('../../assets/images/payments/qris.png') },
  { method: 'gopay', title: 'GoPay', logo: require('../../assets/images/payments/gopay.webp') },
] as const;

function normalize(text: string) {
  return text.trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' ');
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.radio, checked && styles.radioChecked]} accessible={false}>
      {checked ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

export function PaymentPicker({
  value,
  onChange,
}: {
  value: PaymentChoice | null;
  onChange: (value: PaymentChoice) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState(false);
  const [bankName, setBankName] = useState('');
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const { height } = useWindowDimensions();
  const selectedBank = value?.method === 'bank' ? value.bank : null;
  const selectedBankDetails = selectedBank
    ? banks.find((bank) => [bank.name, ...bank.aliases].some((name) => normalize(name) === normalize(selectedBank)))
    : undefined;
  const query = normalize(search);
  const filteredBanks = banks.filter((bank) =>
    [bank.name, ...bank.aliases].some((name) => normalize(name).includes(query)),
  );
  const keyboardInset = keyboardTop === null ? 0 : Math.max(0, height - keyboardTop);

  useEffect(() => {
    if (!visible) return;

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      (event) => setKeyboardTop(event.endCoordinates.screenY),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  function openBanks() {
    Keyboard.dismiss();
    setSearch('');
    setManual(false);
    setBankName('');
    setKeyboardTop(null);
    setVisible(true);
  }

  function closeBanks() {
    Keyboard.dismiss();
    setVisible(false);
    setKeyboardTop(null);
  }

  function chooseBank(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange({ method: 'bank', bank: trimmed });
    closeBanks();
  }

  return (
    <>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Pilihan pembayaran">
        {methods.map((option) => {
          const checked = value?.method === option.method;
          const subtitle = option.method === 'bank'
            ? selectedBank ?? 'Pilih bank asal transfer'
            : option.method === 'qris'
              ? 'Pilihan pembayaran dengan QRIS'
              : 'Pilihan pembayaran lewat GoPay';

          return (
            <Pressable
              key={option.method}
              accessibilityRole="radio"
              aria-checked={checked}
              accessibilityState={{ checked }}
              accessibilityLabel={`${option.title}. ${subtitle}`}
              accessibilityHint={option.method === 'bank' ? 'Buka daftar untuk memilih atau mengganti bank' : undefined}
              onPress={() => {
                if (option.method === 'bank') openBanks();
                else onChange({ method: option.method });
              }}
              style={({ pressed }) => [styles.choice, checked && styles.selected, pressed && styles.pressed]}
            >
              <View style={styles.logoTile} accessible={false}>
                {option.method !== 'bank' ? (
                  <Image source={option.logo} style={styles.logo} contentFit="contain" accessibilityLabel={`Logo ${option.title}`} />
                ) : selectedBankDetails ? (
                  <Image source={selectedBankDetails.logo} style={styles.logo} contentFit="contain" accessibilityLabel={`Logo ${selectedBankDetails.name}`} />
                ) : selectedBank ? (
                  <Ionicons name="business-outline" size={21} color={c.mint700} accessible={false} />
                ) : (
                  <View style={styles.bankPreview}>
                    {banks.slice(0, 4).map((bank) => (
                      <Image key={bank.name} source={bank.logo} style={styles.bankPreviewLogo} contentFit="contain" accessibilityLabel={`Logo ${bank.name}`} />
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.choiceCopy}>
                <Text style={styles.choiceTitle}>{option.title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              {option.method === 'bank' ? (
                <View style={styles.bankAffordance} accessible={false}>
                  {selectedBank ? <Text style={styles.actionText}>Ganti</Text> : null}
                  <Ionicons name="chevron-forward" size={15} color={c.mint700} accessible={false} />
                </View>
              ) : null}
              <RadioMark checked={checked} />
            </Pressable>
          );
        })}
      </View>

      <Sheet visible={visible} onClose={closeBanks}>
        <View style={{ paddingBottom: keyboardInset }} onAccessibilityEscape={closeBanks}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} accessibilityRole="header">Pilih bank asal transfer</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup pilihan bank"
              onPress={closeBanks}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Ionicons name="close-outline" size={24} color={c.ink} accessible={false} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: Math.max(120, height * 0.76 - 72 - keyboardInset) }}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>Hanya memilih preferensi. Tidak ada transfer yang diproses.</Text>
            {manual ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Keyboard.dismiss();
                    setManual(false);
                  }}
                  style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                >
                  <Ionicons name="arrow-back-outline" size={17} color={c.mint700} accessible={false} />
                  <Text style={styles.actionText}>Kembali ke daftar bank</Text>
                </Pressable>
                <Field
                  label="Nama bank lain di Indonesia"
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Tulis nama bank asal transfer"
                  maxLength={80}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => chooseBank(bankName)}
                  inputStyle={styles.input}
                />
                <Button
                  label="Gunakan bank ini"
                  disabled={!bankName.trim()}
                  onPress={() => chooseBank(bankName)}
                />
              </>
            ) : (
              <>
                <Field
                  label="Cari bank"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Nama atau singkatan bank"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  inputStyle={styles.input}
                  right={<Ionicons name="search-outline" size={18} color={c.muted} accessible={false} />}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bank lain di Indonesia"
                  accessibilityHint="Tulis sendiri nama bank yang tidak ada di daftar"
                  onPress={() => {
                    Keyboard.dismiss();
                    setManual(true);
                  }}
                  style={({ pressed }) => [styles.otherBank, pressed && styles.pressed]}
                >
                  <View style={styles.choiceCopy}>
                    <Text style={styles.bankName}>Bank lain di Indonesia</Text>
                    <Text style={styles.subtitle}>Tulis nama bank sendiri</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={c.mint700} accessible={false} />
                </Pressable>
                {filteredBanks.length ? (
                  <View accessibilityRole="radiogroup" accessibilityLabel="Nama bank">
                    {filteredBanks.map((bank) => {
                      const checked = selectedBankDetails?.name === bank.name;
                      return (
                        <Pressable
                          key={bank.name}
                          accessibilityRole="radio"
                          accessibilityLabel={bank.name}
                          aria-checked={checked}
                          accessibilityState={{ checked }}
                          onPress={() => chooseBank(bank.name)}
                          style={({ pressed }) => [styles.bankRow, checked && styles.selected, pressed && styles.pressed]}
                        >
                          <View style={styles.bankLogoTile} accessible={false}>
                            <Image source={bank.logo} style={styles.logo} contentFit="contain" accessibilityLabel={`Logo ${bank.name}`} />
                          </View>
                          <Text style={[styles.bankName, styles.choiceCopy]}>{bank.name}</Text>
                          <RadioMark checked={checked} />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noResults} accessibilityLiveRegion="polite">
                    Bank tidak ditemukan. Pilih “Bank lain di Indonesia” untuk menulis nama bank.
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  choices: { gap: 10 },
  choice: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: c.paper,
    borderWidth: hairline,
    borderColor: c.line,
    borderRadius: radius.md,
  },
  selected: { borderColor: c.mint600, backgroundColor: c.mint50 },
  logoTile: {
    width: 76,
    height: 44,
    borderRadius: 8,
    backgroundColor: c.paper,
    borderWidth: hairline,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 64, height: 32 },
  bankLogoTile: { width: 76, height: 44, borderRadius: 8, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' },
  bankPreview: { width: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  bankPreviewLogo: { width: 30, height: 16 },
  choiceCopy: { flex: 1, minWidth: 0, gap: 3 },
  choiceTitle: { fontFamily: f.semibold, fontSize: 14, color: c.ink },
  subtitle: { fontFamily: f.regular, fontSize: 11, lineHeight: 17, color: c.muted },
  bankAffordance: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontFamily: f.medium, fontSize: 11, color: c.mint700 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: hairline,
    borderColor: c.soft,
    backgroundColor: c.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: { borderColor: c.mint700 },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: c.mint700 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sheetTitle: { flex: 1, fontFamily: f.semibold, fontSize: 16, lineHeight: 23, color: c.ink },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sheetContent: { gap: 14, paddingBottom: 8 },
  input: { minHeight: 44 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  otherBank: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: c.line,
    backgroundColor: c.wash,
  },
  bankRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: c.line,
    backgroundColor: c.paper,
  },
  bankName: { fontFamily: f.medium, fontSize: 13, color: c.ink },
  noResults: { fontFamily: f.regular, fontSize: 12, lineHeight: 19, color: c.muted, paddingVertical: 12 },
  pressed: { opacity: 0.72 },
});
