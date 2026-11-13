import { EVENT_TYPE_LABEL, listEvents, type Event } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials, wibStartOfDayIso } from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { c, f } from '@/theme';
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
  venue: string | null;
  posterUrl: string | null;
  goingCount: number;
  goingNames: string[];
  priceFrom: number | null;
  isNew: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NO_ITEMS: EventItem[] = [];

function toItem(event: Event): EventItem {
  const created = new Date(event.created_at).getTime();
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: EVENT_TYPE_LABEL[event.type] ?? 'Event',
    startsAt: event.starts_at ? new Date(event.starts_at) : null,
    venue: [event.venue_name, event.city].filter(Boolean).join(', ') || null,
    posterUrl: event.cover_image_url || null,
    goingCount: Number(event.going_count ?? 0),
    goingNames: (event.going_names ?? []).slice(0, 3),
    priceFrom: event.price_min == null ? null : Number(event.price_min),
    isNew: Number.isFinite(created) && Date.now() - created < WEEK_MS,
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
  if (!date) return null;
  return (
    <View style={styles.dateBlock}>
      <Text style={styles.dateDay}>{fmtDate(date, { day: '2-digit' })}</Text>
      <Text style={styles.dateMonth}>{fmtDate(date, { month: 'short' }).replace('.', '')}</Text>
    </View>
  );
}

function GoingStack({ names, count }: { names: string[]; count: number }) {
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

function EventRow({ item, onPress }: { item: EventItem; onPress: () => void }) {
  const price = fmtPrice(item.priceFrom);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Poster uri={item.posterUrl} style={styles.rowPoster} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.startsAt && (
          <Text style={styles.rowMeta}>
            {fmtDate(item.startsAt, { day: 'numeric', month: 'short', year: '2-digit' })} ·{' '}
            {fmtTime(item.startsAt)}
          </Text>
        )}
        {price && <Text style={styles.rowPrice}>{price}</Text>}
      </View>
    </Pressable>
  );
}

function Pulse({ style }: { style: StyleProp<ViewStyle> }) {
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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const eventsQuery = useQuery(async () => {
    const payload = await listEvents({ from: wibStartOfDayIso(new Date()), pageSize: 20 });
    return payload.data.map(toItem);
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

  const recommended = useMemo(() => filtered.slice(0, 6), [filtered]);

  const upcoming = useMemo(() => {
    const shown = new Set(recommended.map((event) => event.id));
    return filtered
      .filter((event) => event.startsAt && !shown.has(event.id))
      .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())
      .slice(0, 8);
  }, [filtered, recommended]);

  const openEvent = (slug: string) =>
    router.push({ pathname: '/events/[slug]', params: { slug } });

  const hasFilter = query.trim() !== '' || category !== null;
  const loading = eventsQuery.loading;
  const error = eventsQuery.error;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require('../../../assets/images/logo-ink.png')}
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
            placeholderTextColor="#7E8D88"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Cari event atau venue"
            style={styles.search}
          />
        </View>

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
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const shadow = {
  shadowColor: '#0F3D2E',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

const styles = StyleSheet.create({
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
  rowBody: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontFamily: f.semibold, fontSize: 14, lineHeight: 20, color: c.ink },
  rowMeta: { fontFamily: f.regular, fontSize: 12, color: c.muted, marginTop: 4 },
  rowPrice: { fontFamily: f.semibold, fontSize: 13, color: c.crimson, marginTop: 4 },

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
