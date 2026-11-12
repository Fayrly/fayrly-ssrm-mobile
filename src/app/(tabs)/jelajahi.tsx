import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EventRow } from '@/components/event-row';
import {
  Button,
  Chip,
  PageHeader,
  Screen,
  Sheet,
  Skeleton,
  StateBlock,
} from '@/components/ui';
import {
  EVENT_TYPE_LABEL,
  errorMessage,
  listEvents,
  type Event,
  type EventType,
  type Pagination,
} from '@/lib/api';
import { wibStartOfDayIso } from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { c, f, hairline, radius } from '@/theme';

type DateRange = '' | 'today' | '7d' | '30d';

const TYPE_OPTIONS: { value: EventType | ''; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'concert', label: EVENT_TYPE_LABEL.concert },
  { value: 'charity', label: EVENT_TYPE_LABEL.charity },
  { value: 'community', label: EVENT_TYPE_LABEL.community },
];

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '', label: 'Semua tanggal' },
  { value: 'today', label: 'Hari ini' },
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
];

const PAGE_SIZE = 12;

function dateRange(value: DateRange): { from?: string; to?: string } {
  if (!value) {
    return {};
  }
  const days = value === 'today' ? 1 : value === '7d' ? 7 : 30;
  return {
    from: wibStartOfDayIso(new Date()),
    to: wibStartOfDayIso(new Date(Date.now() + days * 86_400_000)),
  };
}

export default function ExploreScreen() {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<EventType | ''>('');
  const [date, setDate] = useState<DateRange>('');
  const [city, setCity] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  const [items, setItems] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  const requestId = useRef(0);

  const citiesQuery = useQuery(() => listEvents({ pageSize: 100 }), []);
  const cities = useMemo(() => {
    const unique = new Set<string>();
    for (const event of citiesQuery.data?.data ?? []) {
      if (event.city) {
        unique.add(event.city);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'id'));
  }, [citiesQuery.data]);

  const load = useCallback(
    (page: number, append: boolean) => {
      const id = ++requestId.current;
      const range = dateRange(date);
      if (append) {
        setLoadingMore(true);
        setMoreError(null);
      } else {
        setLoading(true);
        setError(null);
        setMoreError(null);
      }

      listEvents({
        q: query,
        type,
        city,
        from: range.from,
        to: range.to,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((response) => {
          if (id !== requestId.current) {
            return;
          }
          setItems((current) => {
            if (!append) {
              return response.data;
            }
            const seen = new Set(current.map((event) => event.id));
            return [...current, ...response.data.filter((event) => !seen.has(event.id))];
          });
          setPagination(response.pagination);
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        })
        .catch((cause: unknown) => {
          if (id !== requestId.current) {
            return;
          }
          const message = errorMessage(cause);
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
          if (append) {
            setMoreError(message);
          } else {
            setError(message);
            setItems([]);
            setPagination(null);
          }
        });
    },
    [city, date, query, type],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when filters change
    load(1, false);
  }, [load]);

  const hasMore = pagination !== null && pagination.page < pagination.total_pages;
  const hasFilters = Boolean(query || type || city || date);

  const reset = () => {
    Keyboard.dismiss();
    setSearchText('');
    setQuery('');
    setType('');
    setCity('');
    setDate('');
  };

  const submitSearch = () => {
    Keyboard.dismiss();
    setQuery(searchText.trim());
  };

  const openEvent = (event: Event) => {
    router.push({ pathname: '/events/[slug]', params: { slug: event.slug } });
  };

  const total = pagination?.total ?? 0;

  return (
    <Screen>
      <PageHeader
        heading="Temukan event"
        subtitle="Filter berdasarkan kategori, tanggal, dan kota."
      />

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={c.mint700} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          placeholder="Cari nama event atau venue"
          placeholderTextColor={c.soft}
          style={styles.searchInput}
          accessibilityLabel="Cari nama event atau venue"
        />
        {searchText ? (
          <Pressable
            onPress={() => {
              setSearchText('');
              setQuery('');
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Bersihkan pencarian"
          >
            <Ionicons name="close-circle" size={18} color={c.soft} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {TYPE_OPTIONS.map((option) => (
          <Chip
            key={option.value || 'all'}
            label={option.label}
            active={type === option.value}
            onPress={() => setType(option.value)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {DATE_OPTIONS.map((option) => (
          <Chip
            key={option.value || 'any'}
            label={option.label}
            active={date === option.value}
            onPress={() => setDate(option.value)}
          />
        ))}
        <Pressable
          onPress={() => setCityOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Pilih kota"
          style={({ pressed }) => [styles.cityChip, city ? styles.cityChipActive : null, pressed && styles.pressed]}
        >
          <Ionicons name="location-outline" size={14} color={city ? c.paper : c.muted} />
          <Text style={[styles.cityChipText, city ? styles.cityChipTextActive : null]} numberOfLines={1}>
            {city || 'Semua kota'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={city ? c.paper : c.soft} />
        </Pressable>
      </ScrollView>

      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          {loading ? 'Memuat event…' : `${total} event ditemukan`}
        </Text>
        {hasFilters ? (
          <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
            <Text style={styles.resetText}>Reset filter</Text>
          </Pressable>
        ) : null}
      </View>

      {error && items.length === 0 ? (
        <StateBlock
          title="Daftar event tidak bisa dimuat"
          body={error}
          icon="cloud-offline-outline"
          action="Coba lagi"
          onAction={() => load(1, false)}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(1, false);
              }}
              tintColor={c.mint700}
            />
          }
          renderItem={({ item }) => (
            <EventRow event={item} onPress={() => openEvent(item)} />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletons}>
                {[0, 1, 2, 3, 4].map((row) => (
                  <View key={row} style={styles.skeletonRow}>
                    <Skeleton height={44} width={42} radius={10} />
                    <View style={styles.skeletonText}>
                      <Skeleton height={14} width="80%" />
                      <Skeleton height={12} width="50%" />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <StateBlock
                title={hasFilters ? 'Tidak ada event yang cocok' : 'Belum ada event'}
                body={
                  hasFilters
                    ? 'Ubah kata kunci atau longgarkan filter untuk melihat event lain.'
                    : 'Event yang diterbitkan penyelenggara akan muncul di sini.'
                }
                icon="funnel-outline"
                action={hasFilters ? 'Reset filter' : undefined}
                onAction={hasFilters ? reset : undefined}
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {loadingMore ? <ActivityIndicator color={c.mint700} /> : null}
              {moreError ? (
                <View style={styles.moreError}>
                  <Text style={styles.moreErrorText}>{moreError}</Text>
                  <Button
                    label="Coba lagi"
                    variant="quiet"
                    onPress={() => pagination && load(pagination.page + 1, true)}
                  />
                </View>
              ) : null}
              {!loadingMore && !moreError && hasMore ? (
                <Button
                  label="Muat lebih banyak"
                  variant="ghost"
                  onPress={() => pagination && load(pagination.page + 1, true)}
                />
              ) : null}
              {!loading && !hasMore && items.length > 0 ? (
                <Text style={styles.endText}>Semua event sudah ditampilkan.</Text>
              ) : null}
            </View>
          }
        />
      )}

      <Sheet visible={cityOpen} onClose={() => setCityOpen(false)}>
        <Text style={styles.sheetTitle}>Pilih kota</Text>
        <Pressable
          onPress={() => {
            setCity('');
            setCityOpen(false);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cityOption, pressed && styles.pressed]}
        >
          <Text style={styles.cityOptionText}>Semua kota</Text>
          {city === '' ? <Ionicons name="checkmark" size={18} color={c.mint700} /> : null}
        </Pressable>
        {citiesQuery.loading ? (
          <ActivityIndicator color={c.mint700} style={styles.cityLoading} />
        ) : null}
        {cities.map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              setCity(option);
              setCityOpen(false);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cityOption, pressed && styles.pressed]}
          >
            <Text style={styles.cityOptionText}>{option}</Text>
            {city === option ? <Ionicons name="checkmark" size={18} color={c.mint700} /> : null}
          </Pressable>
        ))}
        {!citiesQuery.loading && cities.length === 0 ? (
          <Text style={styles.cityEmpty}>Daftar kota belum tersedia.</Text>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    marginHorizontal: 20,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: f.regular,
    fontSize: 13,
    color: c.ink,
    paddingVertical: 0,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  cityChip: {
    height: 36,
    maxWidth: 190,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cityChipActive: {
    backgroundColor: c.mint700,
    borderColor: c.mint700,
  },
  cityChipText: {
    fontFamily: f.medium,
    fontSize: 12,
    color: c.muted,
  },
  cityChipTextActive: {
    color: c.paper,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultText: {
    fontFamily: f.medium,
    fontSize: 11,
    color: c.muted,
  },
  resetText: {
    fontFamily: f.semibold,
    fontSize: 11,
    color: c.mint700,
  },
  list: {
    paddingBottom: 28,
    flexGrow: 1,
  },
  skeletons: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonText: {
    flex: 1,
    gap: 8,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  moreError: {
    alignItems: 'center',
    gap: 4,
  },
  moreErrorText: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.crimson,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  endText: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.soft,
    textAlign: 'center',
  },
  sheetTitle: {
    fontFamily: f.semibold,
    fontSize: 18,
    color: c.ink,
    marginBottom: 10,
  },
  cityOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: hairline,
    borderBottomColor: c.line,
  },
  cityOptionText: {
    fontFamily: f.regular,
    fontSize: 14,
    color: c.ink,
  },
  cityLoading: {
    marginVertical: 16,
  },
  cityEmpty: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.muted,
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
