import { EVENT_TYPE_LABEL, listEvents, type Event } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { useThemeMode, type ThemeMode } from '@/lib/theme-mode';
import { c as light, dark, f, type Colors } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EventItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  startsAt: Date | null;
  endsAt: Date | null;
  ended: boolean;
  venue: string | null;
  posterUrl: string | null;
  goingCount: number;
  goingNames: string[];
  priceFrom: number | null;
  isNew: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NO_ITEMS: EventItem[] = [];

function toItem(event: Event, now: number): EventItem {
  const created = new Date(event.created_at).getTime();
  const startsAt = event.starts_at ? new Date(event.starts_at) : null;
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;
  const ended =
    event.status === 'completed' ||
    event.status === 'cancelled' ||
    (endsAt ? endsAt.getTime() < now : startsAt ? startsAt.getTime() < now : false);
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: EVENT_TYPE_LABEL[event.type] ?? 'Event',
    startsAt,
    endsAt,
    ended,
    venue: [event.venue_name, event.city].filter(Boolean).join(', ') || null,
    posterUrl: event.cover_image_url || null,
    goingCount: Number(event.going_count ?? 0),
    goingNames: (event.going_names ?? []).slice(0, 3),
    priceFrom: event.price_min == null ? null : Number(event.price_min),
    isNew: Number.isFinite(created) && now - created < WEEK_MS,
  };
}

const TZ = 'Asia/Jakarta';

const fmtDate = (d: Date, o: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString('id-ID', { timeZone: TZ, ...o });

const fmtTime = (d: Date) =>
  `${d.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} WIB`;

const fmtPrice = (n: number | null) =>
  n == null ? null : n === 0 ? 'Gratis' : `Rp${n.toLocaleString('id-ID')}`;

function Poster({ uri, style }: { uri: string | null; style: StyleProp<ImageStyle> }) {
  const { c, styles } = useExploreTheme();
  if (!uri) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.posterFallback]}>
        <Ionicons name="image-outline" size={28} color={c.mint300} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={200}
      accessibilityIgnoresInvertColors
    />
  );
}

function DateBlock({ date }: { date: Date | null }) {
  const { styles } = useExploreTheme();
  if (!date) return null;
  return (
    <View style={styles.dateBlock}>
      <Text style={styles.dateDay}>{fmtDate(date, { day: '2-digit' })}</Text>
      <Text style={styles.dateMonth}>{fmtDate(date, { month: 'short' }).replace('.', '')}</Text>
    </View>
  );
}

function GoingStack({ names, count }: { names: string[]; count: number }) {
  const { styles } = useExploreTheme();
  if (count <= 0) return null;
  return (
    <View style={styles.going} accessibilityLabel={`${count} orang akan hadir`}>
      {names.map((name, i) => (
        <View
          key={`${name}-${i}`}
          style={[styles.goingAvatar, { marginLeft: i === 0 ? 0 : -10 }]}
        >
          <Text style={styles.goingInitials}>{initials(name)}</Text>
        </View>
      ))}
      <Text style={[styles.goingText, names.length > 0 && styles.goingTextSpaced]}>
        {count} akan hadir
      </Text>
    </View>
  );
}

function EventCard({
  item,
  width,
  onPress,
}: {
  item: EventItem;
  width: number;
  onPress: () => void;
}) {
  const { c, styles } = useExploreTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.venue ? `, ${item.venue}` : ''}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View>
        <Poster uri={item.posterUrl} style={styles.cardPoster} />
        {item.isNew && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Baru</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <DateBlock date={item.startsAt} />
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
      {item.venue && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={c.muted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.venue}
          </Text>
        </View>
      )}
      <GoingStack names={item.goingNames} count={item.goingCount} />
    </Pressable>
  );
}

function EventRow({
  item,
  onPress,
  ended,
}: {
  item: EventItem;
  onPress: () => void;
  ended?: boolean;
}) {
  const { styles } = useExploreTheme();
  const price = fmtPrice(item.priceFrom);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${ended ? ', sudah selesai' : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Poster uri={item.posterUrl} style={[styles.rowPoster, ended && styles.rowPosterEnded]} />
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={[styles.rowTitle, ended && styles.rowTitleEnded]} numberOfLines={2}>
            {item.title}
          </Text>
          {ended && (
            <View style={styles.endedBadge}>
              <Text style={styles.endedBadgeText}>Selesai</Text>
            </View>
          )}
        </View>
        {item.startsAt && (
          <Text style={styles.rowMeta}>
            {fmtDate(item.startsAt, { day: 'numeric', month: 'short', year: '2-digit' })} ·{' '}
            {fmtTime(item.startsAt)}
          </Text>
        )}
        {price && <Text style={[styles.rowPrice, ended && styles.rowPriceEnded]}>{price}</Text>}
      </View>
    </Pressable>
  );
}

function Pulse({ style }: { style: StyleProp<ViewStyle> }) {
  const { styles } = useExploreTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[style, styles.pulse, { opacity }]} />;
}

function CardSkeleton({ width }: { width: number }) {
  const { styles } = useExploreTheme();
  return (
    <View style={[styles.card, { width }]}>
      <Pulse style={styles.cardPoster} />
      <Pulse style={styles.skeletonTitle} />
      <Pulse style={styles.skeletonMeta} />
    </View>
  );
}

function Message({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { styles } = useExploreTheme();
  return (
    <View style={styles.message}>
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageBody}>{body}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.messageBtn}>
          <Text style={styles.messageBtnText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { styles } = useExploreTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} accessibilityRole="link" hitSlop={12}>
          <Text style={styles.seeAll}>Lihat semua</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { mode, c, styles } = useExploreTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const eventsQuery = useQuery(async () => {
    const payload = await listEvents({ pageSize: 50 });
    const now = Date.now();
    return payload.data.map((event) => toItem(event, now));
  }, []);

  const items = eventsQuery.data ?? NO_ITEMS;

  const cardWidth = Math.round(width * 0.82);
  const gap = 12;

  const categories = useMemo(
    () => Array.from(new Set(items.map((event) => event.category))),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (event) =>
        (!category || event.category === category) &&
        (!q ||
          event.title.toLowerCase().includes(q) ||
          (event.venue ?? '').toLowerCase().includes(q)),
    );
  }, [items, query, category]);

  const { active, past } = useMemo(() => {
    const live: EventItem[] = [];
    const done: EventItem[] = [];
    for (const event of filtered) {
      (event.ended ? done : live).push(event);
    }
    live.sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0));
    done.sort((a, b) => (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0));
    return { active: live, past: done };
  }, [filtered]);

  const recommended = useMemo(() => active.slice(0, 6), [active]);
  const upcoming = useMemo(() => active.slice(6, 14), [active]);
  const pastEvents = useMemo(() => past.slice(0, 8), [past]);

  const openEvent = (slug: string) =>
    router.push({ pathname: '/events/[slug]', params: { slug } });

  const hasFilter = query.trim() !== '' || category !== null;
  const loading = eventsQuery.loading;
  const error = eventsQuery.error;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image
          source={
            mode === 'dark'
              ? require('../../../assets/images/splash-logo-light.png')
              : require('../../../assets/images/logo-ink.png')
          }
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Fayrly"
        />
        <Pressable
          onPress={() => router.push(user ? '/akun' : '/masuk')}
          accessibilityRole="button"
          accessibilityLabel={user ? 'Buka akun' : 'Masuk'}
          style={({ pressed }) => [styles.userBtn, pressed && styles.pressed]}
        >
          <Ionicons name="person-outline" size={22} color={c.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.refreshing}
            onRefresh={eventsQuery.reload}
            tintColor={c.mint700}
            colors={[c.mint700]}
          />
        }
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color={c.muted} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari event atau venue"
            placeholderTextColor={c.soft}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Cari event atau venue"
            style={styles.search}
          />
        </View>

        {!loading && categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Pressable
              onPress={() => setCategory(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: category === null }}
              style={({ pressed }) => [
                styles.chip,
                category === null && styles.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, category === null && styles.chipTextActive]}>Semua</Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory((current) => (current === cat ? null : cat))}
                accessibilityRole="button"
                accessibilityState={{ selected: category === cat }}
                style={({ pressed }) => [
                  styles.chip,
                  category === cat && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading && (
          <ScrollView horizontal scrollEnabled={false} contentContainerStyle={styles.carousel}>
            <CardSkeleton width={cardWidth} />
            <View style={{ width: gap }} />
            <CardSkeleton width={cardWidth} />
          </ScrollView>
        )}

        {!loading && error && items.length === 0 && (
          <Message
            title="Event belum bisa dimuat"
            body={error}
            action="Coba lagi"
            onAction={eventsQuery.reload}
          />
        )}

        {!loading && !error && filtered.length === 0 && (
          <Message
            title={hasFilter ? 'Tidak ada event yang cocok' : 'Belum ada event'}
            body={
              hasFilter
                ? 'Ubah kata kunci atau pilih kategori lain.'
                : 'Event yang diterbitkan penyelenggara akan muncul di sini.'
            }
            action={hasFilter ? 'Hapus pencarian' : undefined}
            onAction={() => {
              setQuery('');
              setCategory(null);
            }}
          />
        )}

        {!loading && recommended.length > 0 && (
          <FlatList
            horizontal
            data={recommended}
            keyExtractor={(event) => event.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + gap}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={styles.carousel}
            ItemSeparatorComponent={() => <View style={{ width: gap }} />}
            renderItem={({ item }) => (
              <EventCard item={item} width={cardWidth} onPress={() => openEvent(item.slug)} />
            )}
          />
        )}

        {!loading && upcoming.length > 0 && (
          <>
            <SectionHeader title="Segera hadir" />
            <View style={styles.list}>
              {upcoming.map((event) => (
                <EventRow key={event.id} item={event} onPress={() => openEvent(event.slug)} />
              ))}
            </View>
          </>
        )}

        {!loading && pastEvents.length > 0 && (
          <>
            <SectionHeader title="Sudah berlangsung" />
            <View style={styles.list}>
              {pastEvents.map((event) => (
                <EventRow key={event.id} item={event} ended onPress={() => openEvent(event.slug)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

function buildStyles(c: Colors) {
  const isDark = c === dark;
  const shadow = {
    shadowColor: isDark ? '#000000' : '#0F3D2E',
    shadowOpacity: isDark ? 0.4 : 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  } as const;

  return StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.canvas },
    pressed: { opacity: 0.85 },
    content: { paddingTop: 8, paddingBottom: 24 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: c.canvas,
    },
    logo: { width: 82, height: 30 },
    userBtn: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.paper,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow,
    },

    searchWrap: { marginTop: 20, marginHorizontal: 20, justifyContent: 'center', marginBottom: 20 },
    searchIcon: { position: 'absolute', left: 16, zIndex: 1 },
    search: {
      height: 52,
      borderRadius: 16,
      backgroundColor: c.paper,
      paddingLeft: 46,
      paddingRight: 16,
      fontFamily: f.regular,
      fontSize: 14,
      color: c.ink,
      ...shadow,
    },

    chips: { paddingHorizontal: 20, paddingVertical: 18, gap: 10 },
    chip: {
      minHeight: 44,
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: c.mint700, borderColor: c.mint700 },
    chipText: { fontFamily: f.medium, fontSize: 14, color: c.ink },
    chipTextActive: { color: c.paper },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 14,
    },
    sectionTitle: { fontFamily: f.semibold, fontSize: 18, color: c.ink },
    seeAll: { fontFamily: f.medium, fontSize: 13, color: c.mint700 },

    carousel: { paddingHorizontal: 20, paddingBottom: 20 },
    card: { backgroundColor: c.paper, borderRadius: 24, padding: 12, ...shadow },
    cardPoster: { width: '100%', aspectRatio: 16 / 10, borderRadius: 16 },
    posterFallback: { backgroundColor: c.mint50, alignItems: 'center', justifyContent: 'center' },
    pulse: { backgroundColor: c.mint50 },
    skeletonTitle: { height: 18, borderRadius: 8, marginTop: 14, width: '80%' },
    skeletonMeta: { height: 14, borderRadius: 8, marginTop: 10, width: '55%' },
    badge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: c.paper,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: { fontFamily: f.semibold, fontSize: 12, color: c.mint700 },
    cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
    dateBlock: {
      width: 48,
      height: 54,
      borderRadius: 14,
      backgroundColor: c.mint100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateDay: { fontFamily: f.bold, fontSize: 17, color: c.ink, lineHeight: 22 },
    dateMonth: { fontFamily: f.medium, fontSize: 12, color: c.mint700, lineHeight: 16 },
    cardTitle: { flex: 1, fontFamily: f.semibold, fontSize: 15, lineHeight: 22, color: c.ink },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    metaText: { flex: 1, fontFamily: f.regular, fontSize: 13, color: c.muted },
    going: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    goingAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.paper,
      backgroundColor: c.mint100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goingInitials: { fontFamily: f.semibold, fontSize: 9, color: c.mint700 },
    goingText: { fontFamily: f.medium, fontSize: 13, color: c.mint700 },
    goingTextSpaced: { marginLeft: 8 },

    list: { paddingHorizontal: 20, gap: 12 },
    row: {
      flexDirection: 'row',
      gap: 14,
      backgroundColor: c.paper,
      borderRadius: 20,
      padding: 10,
      ...shadow,
    },
    rowPoster: { width: 78, height: 78, borderRadius: 14 },
    rowPosterEnded: { opacity: 0.55 },
    rowBody: { flex: 1, justifyContent: 'center' },
    rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    rowTitle: { flex: 1, fontFamily: f.semibold, fontSize: 14, lineHeight: 20, color: c.ink },
    rowTitleEnded: { color: c.muted },
    rowMeta: { fontFamily: f.regular, fontSize: 12, color: c.muted, marginTop: 4 },
    rowPrice: { fontFamily: f.semibold, fontSize: 13, color: c.crimson, marginTop: 4 },
    rowPriceEnded: { color: c.soft },
    endedBadge: {
      backgroundColor: c.wash,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    endedBadgeText: { fontFamily: f.medium, fontSize: 10, color: c.muted },

    message: {
      marginHorizontal: 20,
      marginBottom: 20,
      padding: 20,
      borderRadius: 20,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    messageTitle: { fontFamily: f.semibold, fontSize: 15, color: c.ink },
    messageBody: { fontFamily: f.regular, fontSize: 13, lineHeight: 20, color: c.muted, marginTop: 6 },
    messageBtn: {
      alignSelf: 'flex-start',
      minHeight: 44,
      marginTop: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: c.mint700,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageBtnText: { fontFamily: f.semibold, fontSize: 14, color: c.paper },
  });
}

const stylesByMode: Record<ThemeMode, ReturnType<typeof buildStyles>> = {
  light: buildStyles(light),
  dark: buildStyles(dark),
};

function useExploreTheme() {
  const { mode, colors } = useThemeMode();
  return { mode, c: colors, styles: stylesByMode[mode] };
}
