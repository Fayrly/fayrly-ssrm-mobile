import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Avatar, Stars } from '@/components/ui';
import { EVENT_TYPE_LABEL, listEvents, listReviews, type Event, type Review } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatShortDate, initials, wibDayKey, wibStartOfDayIso } from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { c, f } from '@/theme';

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

type EventItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: Event['status'];
  city: string;
  startsAt: Date | null;
  venue: string | null;
  posterUrl: string | null;
  goingCount: number;
  goingNames: string[];
  priceFrom: number | null;
  rating: number;
  reviewCount: number;
  isNew: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SPOTLIGHT_HEIGHT = 232;
const NO_ITEMS: EventItem[] = [];
const NO_REVIEWS: Review[] = [];

function toItem(event: Event): EventItem {
  const created = new Date(event.created_at).getTime();
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: EVENT_TYPE_LABEL[event.type] ?? 'Event',
    status: event.status,
    city: event.city || '',
    startsAt: event.starts_at ? new Date(event.starts_at) : null,
    venue: [event.venue_name, event.city].filter(Boolean).join(', ') || null,
    posterUrl: event.cover_image_url || null,
    goingCount: Number(event.going_count ?? 0),
    goingNames: (event.going_names ?? []).slice(0, 3),
    priceFrom: event.price_min == null ? null : Number(event.price_min),
    rating: Number(event.rating_avg ?? 0),
    reviewCount: Number(event.review_count ?? 0),
    isNew: Number.isFinite(created) && Date.now() - created < WEEK_MS,
  };
}

const canBuy = (status: Event['status']) => status === 'published' || status === 'ongoing';

/* -------------------------------------------------------------------------- */
/*  Format id-ID / WIB                                                        */
/* -------------------------------------------------------------------------- */

const TZ = 'Asia/Jakarta';

const fmtDate = (d: Date, o: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString('id-ID', { timeZone: TZ, ...o });

const fmtTime = (d: Date) =>
  `${d.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} WIB`;

const fmtPrice = (n: number | null) =>
  n == null ? null : n === 0 ? 'Gratis' : `Rp${n.toLocaleString('id-ID')}`;

function relativeDay(date: Date): string {
  const days = Math.round(
    (Date.parse(wibDayKey(date)) - Date.parse(wibDayKey(new Date()))) / 86_400_000,
  );
  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  if (days < 7) return `${days} hari lagi`;
  return fmtDate(date, { day: 'numeric', month: 'short' });
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

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
            {relativeDay(item.startsAt)} · {fmtTime(item.startsAt)}
          </Text>
        )}
        {item.venue && (
          <View style={styles.rowVenue}>
            <Ionicons name="location-outline" size={12} color={c.soft} />
            <Text style={styles.rowVenueText} numberOfLines={1}>
              {item.venue}
            </Text>
          </View>
        )}
        <View style={styles.rowFooter}>
          {price && (
            <Text style={[styles.rowPrice, price === 'Gratis' && styles.rowPriceFree]}>{price}</Text>
          )}
          {item.reviewCount > 0 && (
            <View style={styles.rowRating}>
              <Ionicons name="star" size={12} color={c.crimson} />
              <Text style={styles.rowRatingText}>{item.rating.toFixed(1).replace('.', ',')}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.soft} />
    </Pressable>
  );
}

function SpotlightSlide({
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
      accessibilityLabel={`Lihat ${item.title}`}
      style={({ pressed }) => [styles.slide, { width }, pressed && styles.pressed]}
    >
      <Poster uri={item.posterUrl} style={styles.slidePoster} />
      <View style={styles.slideScrim} />
      <View style={styles.slideTop}>
        <View style={styles.slideBadge}>
          <Text style={styles.slideBadgeText}>{item.category}</Text>
        </View>
        {item.status === 'ongoing' && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Berlangsung</Text>
          </View>
        )}
      </View>
      <View style={styles.slideBottom}>
        <Text style={styles.slideTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.slideMeta}>
          <Ionicons name="calendar-outline" size={13} color={c.paper} />
          <Text style={styles.slideMetaText}>
            {item.startsAt
              ? fmtDate(item.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })
              : 'Jadwal menyusul'}
          </Text>
          {item.city ? (
            <>
              <Ionicons name="location-outline" size={13} color={c.paper} />
              <Text style={[styles.slideMetaText, styles.slideMetaCity]} numberOfLines={1}>
                {item.city}
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.slideFooter}>
          <View>
            <Text style={styles.slidePriceLabel}>Mulai dari</Text>
            <Text style={styles.slidePrice}>{fmtPrice(item.priceFrom) ?? 'Cek detail'}</Text>
          </View>
          <View style={styles.slideCta}>
            <Text style={styles.slideCtaText}>Lihat event</Text>
            <Ionicons name="arrow-forward" size={14} color={c.mint700} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function SpotlightCarousel({
  items,
  width,
  onOpen,
}: {
  items: EventItem[];
  width: number;
  onOpen: (slug: string) => void;
}) {
  const listRef = useRef<FlatList<EventItem>>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const count = items.length;
  const autoPlay = count > 1 && !paused && !interacting;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      const safe = ((next % count) + count) % count;
      indexRef.current = safe;
      setIndex(safe);
      listRef.current?.scrollToIndex({ index: safe, animated: true });
    },
    [count],
  );

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => goTo(indexRef.current + 1), 5200);
    return () => clearInterval(id);
  }, [autoPlay, goTo]);

  return (
    <View style={styles.spotlight}>
      <View style={[styles.spotlightFrame, { width }]}>
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          keyExtractor={(event) => event.id}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={(event) => {
            const i = Math.round(event.nativeEvent.contentOffset.x / width);
            if (i >= 0 && i < count && i !== indexRef.current) {
              indexRef.current = i;
              setIndex(i);
            }
          }}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setInteracting(true)}
          onScrollEndDrag={() => setInteracting(false)}
          onMomentumScrollEnd={() => setInteracting(false)}
          renderItem={({ item }) => (
            <SpotlightSlide item={item} width={width} onPress={() => onOpen(item.slug)} />
          )}
        />
        {count > 1 && (
          <Pressable
            onPress={() => setPaused((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Putar carousel otomatis' : 'Jeda carousel otomatis'}
            style={({ pressed }) => [styles.pauseBtn, pressed && styles.pressed]}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={16} color={c.mint700} />
          </Pressable>
        )}
      </View>
      {count > 1 && (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => goTo(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Sorotan ${i + 1}: ${item.title}`}
              accessibilityState={{ selected: i === index }}
              style={styles.dotHit}
            >
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function CityCard({
  city,
  count,
  active,
  onPress,
}: {
  city: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${city}, ${count} event`}
      style={({ pressed }) => [styles.cityCard, active && styles.cityCardActive, pressed && styles.pressed]}
    >
      <Ionicons name={active ? 'location' : 'location-outline'} size={18} color={active ? c.paper : c.mint700} />
      <Text style={[styles.cityName, active && styles.cityNameActive]} numberOfLines={1}>
        {city}
      </Text>
      <Text style={[styles.cityCount, active && styles.cityCountActive]}>{count} event</Text>
    </Pressable>
  );
}

function ReviewSnippet({ review, onEventPress }: { review: Review; onEventPress: () => void }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <Stars value={review.rating} size={12} />
        <Text style={styles.reviewDate}>{formatShortDate(review.created_at)}</Text>
      </View>
      <Text style={styles.reviewBody} numberOfLines={3}>
        {review.body}
      </Text>
      <View style={styles.reviewFooter}>
        <Avatar name={review.user_name} size={30} />
        <View style={styles.reviewWho}>
          <Text style={styles.reviewName} numberOfLines={1}>
            {review.user_name}
          </Text>
          <Pressable onPress={onEventPress} hitSlop={6} accessibilityRole="link">
            <Text style={styles.reviewEvent} numberOfLines={1}>
              {review.event_title}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
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

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  const eventsQuery = useQuery(async () => {
    const payload = await listEvents({ from: wibStartOfDayIso(new Date()), pageSize: 20 });
    return payload.data.map(toItem);
  }, []);

  const reviewsQuery = useQuery(async () => {
    const payload = await listReviews(1, 12);
    return payload.data
      .filter((review) => review.rating >= 4 && review.body.trim().length >= 40)
      .slice(0, 6);
  }, []);

  const items = eventsQuery.data ?? NO_ITEMS;
  const reviews = reviewsQuery.data ?? NO_REVIEWS;

  const cardWidth = Math.round(width * 0.82);
  const bannerWidth = Math.max(272, Math.min(width - 40, 560));
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
        (!cityFilter || event.city === cityFilter) &&
        (!q ||
          event.title.toLowerCase().includes(q) ||
          (event.venue ?? '').toLowerCase().includes(q)),
    );
  }, [items, query, category, cityFilter]);

  const recommended = useMemo(() => filtered.slice(0, 6), [filtered]);

  const spotlight = useMemo(
    () =>
      filtered
        .filter((event) => canBuy(event.status))
        .sort(
          (a, b) =>
            b.rating - a.rating ||
            b.goingCount - a.goingCount ||
            (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0),
        )
        .slice(0, 5),
    [filtered],
  );

  const schedule = useMemo(
    () =>
      filtered
        .filter((event) => event.startsAt)
        .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())
        .slice(0, 6),
    [filtered],
  );

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of items) {
      if (!event.city) continue;
      counts.set(event.city, (counts.get(event.city) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'),
    );
  }, [items]);

  const freeEvents = useMemo(
    () => filtered.filter((event) => canBuy(event.status) && event.priceFrom === 0).slice(0, 4),
    [filtered],
  );

  const openEvent = (slug: string) =>
    router.push({ pathname: '/events/[slug]', params: { slug } });

  const selectCity = (name: string) => {
    setCityFilter((current) => (current === name ? null : name));
    setQuery('');
    setCategory(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const hasFilter = query.trim() !== '' || category !== null || cityFilter !== null;
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
        ref={scrollRef}
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

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {[null, ...categories].map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat ?? 'semua'}
                  onPress={() => setCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {cat ?? 'Semua'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <SectionHeader title="Rekomendasi" onSeeAll={() => router.push('/jelajahi')} />

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
              setCityFilter(null);
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

        {loading && (
          <View style={styles.spotlightSection}>
            <Pulse style={[styles.spotlightFrame, { width: bannerWidth }]} />
          </View>
        )}

        {!loading && spotlight.length > 0 && (
          <View style={styles.spotlightSection}>
            <SectionHeader title="Sorotan event" />
            <SpotlightCarousel
              key={spotlight.map((event) => event.id).join('|')}
              items={spotlight}
              width={bannerWidth}
              onOpen={openEvent}
            />
          </View>
        )}

        {!loading && schedule.length > 0 && (
          <>
            <SectionHeader title="Segera hadir" onSeeAll={() => router.push('/jelajahi')} />
            <View style={styles.list}>
              {schedule.map((event) => (
                <EventRow key={event.id} item={event} onPress={() => openEvent(event.slug)} />
              ))}
            </View>
          </>
        )}

        {!loading && cities.length > 0 && (
          <>
            <SectionHeader title="Jelajahi kota" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityRow}
            >
              {cities.map((city) => (
                <CityCard
                  key={city.name}
                  city={city.name}
                  count={city.count}
                  active={cityFilter === city.name}
                  onPress={() => selectCity(city.name)}
                />
              ))}
            </ScrollView>
          </>
        )}

        {!loading && freeEvents.length > 0 && (
          <>
            <SectionHeader title="Gratis & terbuka" />
            <FlatList
              horizontal
              data={freeEvents}
              keyExtractor={(event) => event.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={Math.round(cardWidth * 0.72) + gap}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.carousel}
              ItemSeparatorComponent={() => <View style={{ width: gap }} />}
              renderItem={({ item }) => (
                <EventCard
                  item={item}
                  width={Math.round(cardWidth * 0.72)}
                  onPress={() => openEvent(item.slug)}
                />
              )}
            />
          </>
        )}

        {reviewsQuery.loading && (
          <>
            <SectionHeader title="Kata penonton" />
            <ScrollView horizontal scrollEnabled={false} contentContainerStyle={styles.reviewRow}>
              <Pulse style={styles.reviewSkeleton} />
              <Pulse style={styles.reviewSkeleton} />
            </ScrollView>
          </>
        )}

        {!reviewsQuery.loading && reviewsQuery.error && (
          <Message
            title="Ulasan belum bisa dimuat"
            body={reviewsQuery.error}
            action="Coba lagi"
            onAction={reviewsQuery.reload}
          />
        )}

        {!reviewsQuery.loading && !reviewsQuery.error && reviews.length > 0 && (
          <>
            <SectionHeader title="Kata penonton" onSeeAll={() => router.push('/ulasan')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewRow}
            >
              {reviews.map((review) => (
                <ReviewSnippet
                  key={review.id}
                  review={review}
                  onEventPress={() => openEvent(review.event_slug)}
                />
              ))}
            </ScrollView>
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

  searchWrap: { marginTop: 20, marginHorizontal: 20, justifyContent: 'center' },
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

  spotlightSection: { alignItems: 'center', marginBottom: 8 },
  spotlight: { alignItems: 'center' },
  spotlightFrame: {
    height: SPOTLIGHT_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: c.mint50,
    ...shadow,
  },
  slide: { height: SPOTLIGHT_HEIGHT, padding: 16, justifyContent: 'space-between' },
  slidePoster: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  slideScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,38,31,0.55)',
  },
  slideTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slideBadge: {
    backgroundColor: c.mint100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slideBadgeText: { fontFamily: f.semibold, fontSize: 11, color: c.mint700 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.crimson,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.paper },
  liveText: { fontFamily: f.semibold, fontSize: 11, color: c.paper },
  slideBottom: { gap: 8 },
  slideTitle: {
    fontFamily: f.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: c.paper,
  },
  slideMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slideMetaText: { fontFamily: f.regular, fontSize: 12, color: 'rgba(255,255,255,0.92)' },
  slideMetaCity: { flexShrink: 1 },
  slideFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  slidePriceLabel: { fontFamily: f.regular, fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  slidePrice: { fontFamily: f.semibold, fontSize: 16, color: c.paper },
  slideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.paper,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slideCtaText: { fontFamily: f.semibold, fontSize: 12, color: c.mint700 },
  pauseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  dotHit: { padding: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.mint200 },
  dotActive: { width: 18, backgroundColor: c.mint700 },

  list: { paddingHorizontal: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.paper,
    borderRadius: 20,
    padding: 12,
    ...shadow,
  },
  rowPoster: { width: 84, height: 84, borderRadius: 16 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: f.semibold, fontSize: 14, lineHeight: 20, color: c.ink },
  rowMeta: { fontFamily: f.regular, fontSize: 12, color: c.muted },
  rowVenue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowVenueText: { flex: 1, fontFamily: f.regular, fontSize: 11, color: c.soft },
  rowFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  rowPrice: { fontFamily: f.semibold, fontSize: 13, color: c.crimson },
  rowPriceFree: { color: c.mint700 },
  rowRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.wash,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rowRatingText: { fontFamily: f.medium, fontSize: 11, color: c.muted },

  cityRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  cityCard: {
    width: 150,
    padding: 14,
    borderRadius: 18,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    gap: 6,
    ...shadow,
  },
  cityCardActive: { backgroundColor: c.mint700, borderColor: c.mint700 },
  cityName: { fontFamily: f.semibold, fontSize: 14, color: c.ink },
  cityNameActive: { color: c.paper },
  cityCount: { fontFamily: f.regular, fontSize: 11, color: c.muted },
  cityCountActive: { color: c.mint100 },

  reviewRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  reviewCard: {
    width: 280,
    backgroundColor: c.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    padding: 16,
    gap: 10,
    ...shadow,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { fontFamily: f.regular, fontSize: 10, color: c.soft },
  reviewBody: { fontFamily: f.regular, fontSize: 13, lineHeight: 20, color: c.ink },
  reviewFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  reviewWho: { flex: 1 },
  reviewName: { fontFamily: f.semibold, fontSize: 12, color: c.ink },
  reviewEvent: { fontFamily: f.regular, fontSize: 11, color: c.mint700 },
  reviewSkeleton: { width: 280, height: 170, borderRadius: 20 },

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
