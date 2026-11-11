import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { body, c, display, f, hairline, kicker, radius, title } from '@/theme';
import { initials } from '@/lib/format';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({
  children,
  style,
  edges = ['top'],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

export function PageHeader({
  kicker: kickerText,
  heading,
  subtitle,
  right,
}: {
  kicker?: string;
  heading: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        {kickerText ? <Text style={styles.kicker}>{kickerText}</Text> : null}
        <Text style={styles.heading} accessibilityRole="header">
          {heading}
        </Text>
        {subtitle ? <Text style={styles.subheading}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHead({
  label,
  action,
  onAction,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="link"
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'quiet';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const tone = variant === 'primary' ? styles.buttonPrimary : variant === 'ghost' ? styles.buttonGhost : styles.buttonQuiet;
  const textTone =
    variant === 'primary' ? styles.buttonPrimaryText : variant === 'ghost' ? styles.buttonGhostText : styles.buttonQuietText;
  const foreground = variant === 'primary' ? c.paper : c.mint700;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={({ pressed }) => [styles.button, tone, pressed && !inactive && styles.buttonPressed, inactive && styles.buttonDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <Text style={[styles.buttonText, textTone]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  error,
  multiline,
  right,
  inputStyle,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  error?: string | null;
  multiline?: boolean;
  right?: ReactNode;
  inputStyle?: StyleProp<TextStyle>;
} & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType' | 'maxLength' | 'returnKeyType' | 'onSubmitEditing' | 'editable' | 'autoCorrect' | 'inputMode'>) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.soft}
          secureTextEntry={secure && !visible}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          accessibilityLabel={label}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setVisible((current) => !current)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            style={styles.fieldAccessory}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.soft} />
          </Pressable>
        ) : (
          right
        )}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  count,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  count?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.chipCount, active && styles.chipCountActive]}>
          <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Stars({
  value,
  size = 16,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
}) {
  const filled = Math.round(value);
  return (
    <View style={styles.stars} accessibilityLabel={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = star <= filled ? 'star' : 'star-outline';
        if (!onChange) {
          return (
            <Ionicons
              key={star}
              name={icon}
              size={size}
              color={star <= filled ? c.mint700 : c.mint200}
            />
          );
        }
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Beri ${star} bintang`}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Ionicons name={icon} size={size + 6} color={star <= filled ? c.mint700 : c.mint300} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={name}
    >
      <Text style={[styles.avatarText, { fontSize: Math.max(11, size * 0.32) }]}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
}

export function IconTile({ name, tone = 'mint' }: { name: IconName; tone?: 'mint' | 'crimson' }) {
  const bg = tone === 'crimson' ? c.crimsonSoft : c.mint50;
  const fg = tone === 'crimson' ? c.crimson : c.mint700;
  return (
    <View style={[styles.iconTile, { backgroundColor: bg }]}>
      <Ionicons name={name} size={18} color={fg} />
    </View>
  );
}

export function StateBlock({
  title: heading,
  body: copy,
  icon = 'calendar-outline',
  action,
  onAction,
  compact,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={26} color={c.mint700} />
      </View>
      <Text style={styles.stateTitle}>{heading}</Text>
      <Text style={styles.stateBody}>{copy}</Text>
      {action && onAction ? (
        <Button label={action} onPress={onAction} variant="ghost" style={styles.stateButton} />
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={18} color={c.crimson} />
      <Text style={styles.bannerText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <Text style={styles.bannerAction}>Coba lagi</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Skeleton({
  height,
  width,
  style,
  radius: r = 12,
}: {
  height: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ height, width: width ?? '100%', backgroundColor: c.mint50, borderRadius: r, opacity }, style]}
    />
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.progressTrack} accessibilityLabel={`${clamped} persen tercapai`}>
      <View style={[styles.progressFill, { width: `${clamped}%` }]} />
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Tutup panel" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyNotice({ text }: { text: string }) {
  return (
    <View style={styles.emptyNotice}>
      <Text style={styles.emptyNoticeText}>{text}</Text>
    </View>
  );
}

export function useContentWidth(max = 560): number {
  const { width } = useWindowDimensions();
  return Math.min(width, max);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  pageHeaderText: {
    flex: 1,
  },
  kicker: {
    ...kicker,
  },
  heading: {
    ...display,
    marginTop: 6,
  },
  subheading: {
    ...body,
    marginTop: 6,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: f.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: c.ink,
  },
  sectionAction: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.mint700,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: c.mint700,
  },
  buttonGhost: {
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
  },
  buttonQuiet: {
    backgroundColor: 'transparent',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontFamily: f.semibold,
    fontSize: 14,
  },
  buttonPrimaryText: {
    color: c.paper,
  },
  buttonGhostText: {
    color: c.ink,
  },
  buttonQuietText: {
    color: c.mint700,
  },
  fieldWrap: {
    gap: 7,
  },
  fieldLabel: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.muted,
  },
  field: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  fieldFocused: {
    borderColor: c.mint600,
  },
  fieldError: {
    borderColor: c.crimson,
  },
  input: {
    flex: 1,
    fontFamily: f.regular,
    fontSize: 14,
    color: c.ink,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    lineHeight: 21,
  },
  fieldAccessory: {
    width: 32,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fieldErrorText: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.crimson,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: {
    backgroundColor: c.mint700,
    borderColor: c.mint700,
  },
  chipText: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.muted,
  },
  chipTextActive: {
    color: c.paper,
  },
  chipCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: c.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipCountText: {
    fontFamily: f.semibold,
    fontSize: 10,
    color: c.mint700,
  },
  chipCountTextActive: {
    color: c.paper,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  avatar: {
    backgroundColor: c.mint100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: f.semibold,
    color: c.mint700,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 36,
    gap: 8,
  },
  stateCompact: {
    paddingVertical: 20,
  },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.mint50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stateTitle: {
    ...title,
    fontSize: 16,
  },
  stateBody: {
    ...body,
    maxWidth: 340,
  },
  stateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: c.crimsonSoft,
  },
  bannerText: {
    flex: 1,
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 18,
    color: c.crimson,
  },
  bannerAction: {
    fontFamily: f.semibold,
    fontSize: 12,
    color: c.crimson,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.mint100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: c.mint700,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,38,31,0.42)',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: c.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: hairline,
    borderColor: c.line,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.mint200,
    marginBottom: 16,
  },
  emptyNotice: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: c.wash,
  },
  emptyNoticeText: {
    ...body,
    fontSize: 12,
    color: c.mint700,
  },
  pressed: {
    opacity: 0.7,
  },
});
