import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EVENT_TYPE_LABEL, type Event } from '@/lib/api';
import { formatCompactPrice, formatEventDate, formatNumber } from '@/lib/format';
import { useThemeMode, type ThemeMode } from '@/lib/theme-mode';
import { c as light, f, hairline, dark, type Colors } from '@/theme';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

function dateParts(value: string): { day: string; month: string } {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
  const monthIndex = Number(
    new Intl.DateTimeFormat('id-ID', { month: 'numeric', timeZone: 'Asia/Jakarta' }).format(date),
  );
  return { day, month: MONTHS[Math.max(0, monthIndex - 1)] };
}

export function EventRow({
  event,
  onPress,
  divider = true,
}: {
  event: Event;
  onPress: () => void;
  divider?: boolean;
}) {
  const { c, styles } = useEventRowTheme();
  const date = dateParts(event.starts_at);
  const price = formatCompactPrice(event.price_min, event.currency);
  const type = EVENT_TYPE_LABEL[event.type] ?? 'Event';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${type}, ${formatEventDate(event.starts_at)}`}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.rail}>
        <Text style={styles.day}>{date.day}</Text>
        <Text style={styles.month}>{date.month}</Text>
        <View style={styles.railLine} />
      </View>

      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={styles.type}>{type}</Text>
          <View style={styles.dot} />
          <Text style={styles.price}>{price}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.venue} numberOfLines={1}>
          {event.venue_name || event.city || 'Lokasi menyusul'}
          {event.city && event.venue_name ? ` · ${event.city}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={c.soft} />
          <Text style={styles.meta}>
            {event.going_count > 0
              ? `${formatNumber(event.going_count)} akan hadir`
              : 'Jadilah yang pertama hadir'}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={c.mint300} style={styles.chevron} />
    </Pressable>
  );
}

function buildStyles(c: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    divider: {
      borderBottomWidth: hairline,
      borderBottomColor: c.line,
    },
    pressed: {
      backgroundColor: c.wash,
    },
    rail: {
      width: 42,
      alignItems: 'flex-start',
      paddingTop: 2,
    },
    day: {
      fontFamily: f.bold,
      fontSize: 26,
      lineHeight: 28,
      letterSpacing: -1,
      color: c.ink,
    },
    month: {
      fontFamily: f.semibold,
      fontSize: 9,
      letterSpacing: 1.4,
      color: c.mint700,
      marginTop: 2,
    },
    railLine: {
      width: 18,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.mint200,
      marginTop: 8,
    },
    content: {
      flex: 1,
      gap: 5,
    },
    topLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    type: {
      fontFamily: f.medium,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: c.mint700,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.mint200,
    },
    price: {
      fontFamily: f.medium,
      fontSize: 10,
      letterSpacing: 0.4,
      color: c.muted,
    },
    title: {
      fontFamily: f.semibold,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: -0.2,
      color: c.ink,
    },
    venue: {
      fontFamily: f.regular,
      fontSize: 12,
      color: c.muted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 1,
    },
    meta: {
      fontFamily: f.regular,
      fontSize: 11,
      color: c.soft,
    },
    chevron: {
      marginTop: 20,
    },

  });
}

const stylesByMode: Record<ThemeMode, ReturnType<typeof buildStyles>> = {
  light: buildStyles(light),
  dark: buildStyles(dark),
};

function useEventRowTheme() {
  const { mode, colors } = useThemeMode();
  return { mode, c: colors, styles: stylesByMode[mode] };
}
