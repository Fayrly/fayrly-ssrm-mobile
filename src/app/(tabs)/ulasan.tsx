import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ReviewCard } from '@/components/review-card';
import { Button, PageHeader, Screen, Skeleton, StateBlock } from '@/components/ui';
import { errorMessage, listReviews, type Pagination, type Review } from '@/lib/api';
import { c, f } from '@/theme';

const PAGE_SIZE = 9;

export default function ReviewsScreen() {
  const [items, setItems] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  const requestId = useRef(0);

  const load = useCallback((page: number, append: boolean) => {
    const id = ++requestId.current;
    if (append) {
      setLoadingMore(true);
      setMoreError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    listReviews(page, PAGE_SIZE)
      .then((response) => {
        if (id !== requestId.current) {
          return;
        }
        setItems((current) => {
          if (!append) {
            return response.data;
          }
          const seen = new Set(current.map((review) => review.id));
          return [...current, ...response.data.filter((review) => !seen.has(review.id))];
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
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load(1, false);
  }, [load]);

  const hasMore = pagination !== null && pagination.page < pagination.total_pages;

  return (
    <Screen>
      <PageHeader
        heading="Cerita peserta"
        subtitle="Catatan asli dari orang yang sudah hadir di event Fayrly."
      />

      {error && items.length === 0 ? (
        <StateBlock
          title="Ulasan belum bisa dimuat"
          body={error}
          icon="cloud-offline-outline"
          action="Coba lagi"
          onAction={() => load(1, false)}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
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
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.summary}>
                <Text style={styles.summaryCount}>
                  {pagination?.total ?? items.length} ulasan
                </Text>
                <Text style={styles.summaryNote}>Diurutkan dari yang terbaru</Text>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              onEventPress={() =>
                router.push({ pathname: '/events/[slug]', params: { slug: item.event_slug } })
              }
            />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletons}>
                {[0, 1, 2, 3].map((row) => (
                  <View key={row} style={styles.skeletonRow}>
                    <Skeleton height={14} width="40%" />
                    <Skeleton height={12} width="90%" />
                    <Skeleton height={12} width="75%" />
                    <Skeleton height={28} width={140} radius={14} />
                  </View>
                ))}
              </View>
            ) : (
              <StateBlock
                title="Belum ada ulasan"
                body="Ulasan akan muncul setelah peserta menyelesaikan event."
                icon="chatbubble-ellipses-outline"
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
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 28,
    flexGrow: 1,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  summaryCount: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: c.ink,
  },
  summaryNote: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
  },
  skeletons: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 22,
  },
  skeletonRow: {
    gap: 8,
  },
  footer: {
    paddingTop: 16,
    gap: 8,
  },
  moreError: {
    alignItems: 'center',
  },
  moreErrorText: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.crimson,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
