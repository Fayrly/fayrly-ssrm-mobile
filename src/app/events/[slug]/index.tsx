import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewCard } from '@/components/review-card';
import { VenueMap } from '@/components/venue-map';
import {
  Avatar,
  Button,
  EmptyNotice,
  ErrorBanner,
  ProgressBar,
  Screen,
  SectionHead,
  Skeleton,
  Stars,
  StateBlock,
} from '@/components/ui';
import {
  ApiError,
  EVENT_TYPE_LABEL,
  createReview,
  getEvent,
  listEventReviews,
  type EventStatus,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  averageLabel,
  formatCompactPrice,
  formatLongDate,
  formatMoney,
  formatNumber,
  formatTimeRange,
  initials,
} from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { useThemeMode, type ThemeMode } from '@/lib/theme-mode';
import { c as light, dark, f, hairline, radius, type Colors } from '@/theme';

const STATUS_NOTE: Partial<Record<EventStatus, string>> = {
  draft: 'Event ini belum diterbitkan, tiket belum tersedia.',
  completed: 'Event ini sudah selesai. Tiket tidak lagi dijual.',
  cancelled: 'Event ini dibatalkan oleh penyelenggara.',
};

export default function EventDetailScreen() {
  const { c, styles } = useDetailTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const key = typeof slug === 'string' ? slug : '';
  const eventQuery = useQuery(() => getEvent(key), [key], key.length > 0);
  const reviewsQuery = useQuery(() => listEventReviews(key, 4), [key], key.length > 0);

  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const event = eventQuery.data;
  const reviews = reviewsQuery.data?.data ?? [];
  const summary = reviewsQuery.data?.summary ?? { count: 0, average: 0 };
  const canBuy = event?.status === 'published' || event?.status === 'ongoing';

  const donationPercent =
    event && (event.donation_target ?? 0) > 0
      ? Math.min(100, Math.round(((event.donation_raised ?? 0) / (event.donation_target ?? 1)) * 100))
      : 0;

  const showNote = (text: string) => {
    setShareNote(text);
    setTimeout(() => setShareNote(null), 2600);
  };

  const shareEvent = async () => {
    if (!event) {
      return;
    }
    const url = Linking.createURL(`/events/${event.slug}`);
    const message = `${event.title} di Fayrly\n${url}`;
    try {
      await Share.share({ message, url, title: event.title });
    } catch {
      try {
        await navigator.clipboard.writeText(message);
        showNote('Tautan event disalin.');
      } catch {
        showNote('Berbagi belum didukung di perangkat ini.');
      }
    }
  };

  const submitReview = async () => {
    if (!event || submitting) {
      return;
    }
    const trimmed = reviewBody.trim();
    if (trimmed.length < 10) {
      setReviewError('Tulis ulasan minimal 10 karakter agar lebih bermanfaat.');
      return;
    }
    if (trimmed.length > 2000) {
      setReviewError('Ulasan maksimal 2000 karakter.');
      return;
    }
    setSubmitting(true);
    setReviewError(null);
    try {
      await createReview(event.slug, { rating, body: trimmed });
      setReviewSuccess(true);
      setReviewBody('');
      setRating(5);
      reviewsQuery.reload();
      eventQuery.reload();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setReviewError('Kamu sudah menulis ulasan untuk event ini.');
      } else {
        setReviewError(
          error instanceof ApiError
            ? error.message
            : 'Ulasan gagal dikirim. Coba lagi sebentar.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (eventQuery.loading) {
    return (
      <Screen>
        <Header />
        <View style={styles.loading}>
          <Skeleton height={210} radius={radius.xl} />
          <Skeleton height={24} width="80%" style={{ marginTop: 20 }} />
          <Skeleton height={14} width="50%" />
          <Skeleton height={120} radius={radius.md} style={{ marginTop: 22 }} />
          <Skeleton height={14} width="95%" style={{ marginTop: 22 }} />
          <Skeleton height={14} width="70%" />
        </View>
      </Screen>
    );
  }

  if (eventQuery.errorStatus === 404) {
    return (
      <Screen>
        <Header />
        <StateBlock
          title="Event tidak ditemukan"
          body="Tautan mungkin sudah berubah atau event telah dihapus."
          icon="compass-outline"
          action="Kembali ke Beranda"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Header />
        <StateBlock
          title="Detail event belum bisa dimuat"
          body={eventQuery.error ?? 'Terjadi kesalahan saat memuat data.'}
          icon="cloud-offline-outline"
          action="Coba lagi"
          onAction={eventQuery.reload}
        />
      </Screen>
    );
  }

  const statusNote = STATUS_NOTE[event.status];
  const typeLabel = EVENT_TYPE_LABEL[event.type] ?? 'Event';

  return (
    <Screen>
      <Header onShare={shareEvent} />
      {shareNote ? <Text style={styles.shareNote}>{shareNote}</Text> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 128 }}
          refreshControl={
            <RefreshControl
              refreshing={eventQuery.refreshing}
              onRefresh={() => {
                eventQuery.reload();
                reviewsQuery.reload();
              }}
              tintColor={c.mint700}
            />
          }
        >
          <View style={styles.cover}>
            {event.cover_image_url ? (
              <Image
                source={{ uri: event.cover_image_url }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.coverFallback}>
                <Ionicons name="image-outline" size={40} color={c.mint300} />
              </View>
            )}
          </View>

          <View style={styles.intro}>
            <Text style={styles.introKicker}>{typeLabel}</Text>
            <Text style={styles.title} accessibilityRole="header">
              {event.title}
            </Text>
            <Text style={styles.introMeta}>
              {formatLongDate(event.starts_at)} · {formatTimeRange(event.starts_at, event.ends_at)}
            </Text>
            <View style={styles.organizerLine}>
              <Avatar name={event.organizer_name || 'Fayrly'} size={26} />
              <Text style={styles.organizerName} numberOfLines={1}>
                {event.organizer_name || 'Penyelenggara Fayrly'}
              </Text>
            </View>
          </View>

          {statusNote ? (
            <View style={styles.statusNote}>
              <Ionicons name="information-circle-outline" size={16} color={c.crimson} />
              <Text style={styles.statusNoteText}>{statusNote}</Text>
            </View>
          ) : null}

          <SectionHead label="Deskripsi" />
          <View style={styles.descriptionBlock}>
            <Text style={styles.description} numberOfLines={expanded ? undefined : 6}>
              {event.description || 'Penyelenggara belum menuliskan deskripsi untuk event ini.'}
            </Text>
            {(event.description?.length ?? 0) > 300 ? (
              <Pressable
                onPress={() => setExpanded((current) => !current)}
                hitSlop={8}
                accessibilityRole="button"
                style={styles.more}
              >
                <Text style={styles.moreText}>{expanded ? 'Ringkas' : 'Baca selengkapnya'}</Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={c.mint700}
                />
              </Pressable>
            ) : null}
            {event.tags.length > 0 ? (
              <View style={styles.tags}>
                {event.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <SectionHead label="Lokasi & venue" />
          <VenueMap
            venueName={event.venue_name}
            venueAddress={event.venue_address}
            city={event.city}
            country={event.country}
          />

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatCompactPrice(event.price_min, event.currency)}
              </Text>
              <Text style={styles.statLabel}>Mulai dari</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatNumber(event.going_count)}</Text>
              <Text style={styles.statLabel}>Akan hadir</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {event.review_count > 0 ? averageLabel(event.rating_avg) : '—'}
              </Text>
              <Text style={styles.statLabel}>
                {event.review_count > 0 ? `${event.review_count} ulasan` : 'Belum ada ulasan'}
              </Text>
            </View>
          </View>

          {event.going_names.length > 0 ? (
            <View style={styles.goingRow}>
              <View style={styles.goingAvatars}>
                {event.going_names.slice(0, 4).map((name, index) => (
                  <View
                    key={`${name}-${index}`}
                    style={[styles.goingAvatar, index > 0 && styles.goingAvatarShift]}
                  >
                    <Avatar name={name} size={24} />
                  </View>
                ))}
              </View>
              <Text style={styles.goingText}>
                {event.going_names.slice(0, 2).join(', ')}
                {event.going_count > event.going_names.slice(0, 2).length
                  ? ` dan ${formatNumber(event.going_count - Math.min(2, event.going_names.length))} lainnya`
                  : ''}{' '}
                akan hadir
              </Text>
            </View>
          ) : null}

          {donationPercent > 0 && event.donation_target ? (
            <View style={styles.donation}>
              <View style={styles.donationTop}>
                <Text style={styles.donationLabel}>Donasi terkumpul</Text>
                <Text style={styles.donationPercent}>{donationPercent}%</Text>
              </View>
              <ProgressBar percent={donationPercent} />
              <Text style={styles.donationMeta}>
                {formatMoney(event.donation_raised ?? 0, event.currency)} dari{' '}
                {formatMoney(event.donation_target, event.currency)}
                {event.beneficiary ? ` · ${event.beneficiary}` : ''}
              </Text>
            </View>
          ) : null}

          <SectionHead label="Ulasan peserta" />
          <View style={styles.reviewSummary}>
            <Text style={styles.average}>{averageLabel(summary.average)}</Text>
            <View>
              <Stars value={summary.average} size={14} />
              <Text style={styles.reviewCount}>
                {summary.count > 0 ? `${summary.count} ulasan` : 'Belum ada ulasan'}
              </Text>
            </View>
          </View>

          {reviewsQuery.error && reviews.length === 0 ? (
            <ErrorBanner message={reviewsQuery.error} onRetry={reviewsQuery.reload} />
          ) : null}

          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} compact />
          ))}

          {!reviewsQuery.loading && reviews.length === 0 && !reviewsQuery.error ? (
            <EmptyNotice text="Belum ada peserta yang menulis ulasan untuk event ini." />
          ) : null}

          <SectionHead label="Tulis ulasan" />
          {isAuthenticated ? (
            <View style={styles.reviewForm}>
              <Text style={styles.formLabel}>Penilaian kamu</Text>
              <Stars value={rating} size={20} onChange={setRating} />
              <TextInput
                value={reviewBody}
                onChangeText={(value) => {
                  setReviewBody(value);
                  setReviewError(null);
                  setReviewSuccess(false);
                }}
                placeholder="Ceritakan pengalamanmu di event ini"
                placeholderTextColor={c.soft}
                multiline
                maxLength={2000}
                style={styles.reviewInput}
                accessibilityLabel="Isi ulasan"
              />
              <View style={styles.formFooter}>
                <Text style={styles.charCount}>{reviewBody.length}/2000</Text>
                <Button
                  label="Kirim ulasan"
                  onPress={submitReview}
                  loading={submitting}
                  icon="send-outline"
                />
              </View>
              {reviewError ? <ErrorBanner message={reviewError} /> : null}
              {reviewSuccess ? (
                <View style={styles.success}>
                  <Ionicons name="checkmark-circle" size={16} color={c.mint700} />
                  <Text style={styles.successText}>Ulasan kamu sudah terkirim.</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/masuk',
                  params: { next: `/events/${event.slug}` },
                })
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.signInPrompt, pressed && styles.pressed]}
            >
              <View style={styles.signInIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={c.mint700} />
              </View>
              <View style={styles.signInText}>
                <Text style={styles.signInTitle}>Masuk untuk menulis ulasan</Text>
                <Text style={styles.signInBody}>
                  Ulasan hanya bisa ditulis oleh peserta yang punya akun Fayrly.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={c.mint700} />
            </Pressable>
          )}

          <View style={styles.orgPanel}>
            <Avatar name={event.organizer_name || 'Fayrly'} size={40} />
            <View style={styles.orgText}>
              <Text style={styles.orgLabel}>Diselenggarakan oleh</Text>
              <Text style={styles.orgName}>{event.organizer_name || 'Fayrly'}</Text>
            </View>
            <View style={styles.orgInitials}>
              <Text style={styles.orgInitialsText}>{initials(event.organizer_name || 'FY')}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerLabel}>Mulai dari</Text>
            <Text style={styles.footerValue}>
              {formatCompactPrice(event.price_min, event.currency)}
            </Text>
          </View>
          <Button
            label={canBuy ? 'Pilih tiket' : 'Tiket belum tersedia'}
            disabled={!canBuy}
            onPress={() =>
              router.push({ pathname: '/events/[slug]/tiket', params: { slug: event.slug } })
            }
            style={styles.footerButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Header({ onShare }: { onShare?: () => void }) {
  const { c, styles } = useDetailTheme();
  return (
    <View style={styles.header}>
      <BackButton />
      <Text style={styles.headerTitle} accessibilityRole="header">
        Detail Event
      </Text>
      {onShare ? (
        <Pressable
          onPress={onShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Bagikan event"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="share-social-outline" size={19} color={c.ink} />
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

function BackButton() {
  const { c, styles } = useDetailTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name="arrow-back" size={20} color={c.ink} />
    </Pressable>
  );
}

function buildStyles(c: Colors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: f.semibold,
      fontSize: 16,
      letterSpacing: -0.3,
      color: c.ink,
    },
    headerSpacer: {
      width: 42,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareNote: {
      fontFamily: f.medium,
      fontSize: 10,
      color: c.mint700,
      textAlign: 'center',
      paddingBottom: 6,
    },
    cover: {
      marginHorizontal: 20,
      height: 214,
      borderRadius: radius.xl,
      backgroundColor: c.mint100,
      overflow: 'hidden',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    intro: {
      paddingHorizontal: 20,
      paddingTop: 18,
      gap: 6,
    },
    introKicker: {
      fontFamily: f.semibold,
      fontSize: 10,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: c.mint700,
    },
    title: {
      fontFamily: f.bold,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.9,
      color: c.ink,
    },
    introMeta: {
      fontFamily: f.regular,
      fontSize: 12,
      lineHeight: 18,
      color: c.muted,
    },
    organizerLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    organizerName: {
      fontFamily: f.regular,
      fontSize: 12,
      color: c.muted,
    },
    statusNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 14,
      padding: 12,
      borderRadius: radius.sm,
      backgroundColor: c.crimsonSoft,
    },
    statusNoteText: {
      flex: 1,
      fontFamily: f.regular,
      fontSize: 12,
      lineHeight: 18,
      color: c.crimson,
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginHorizontal: 20,
      marginTop: 18,
      paddingVertical: 14,
      borderTopWidth: hairline,
      borderBottomWidth: hairline,
      borderColor: c.line,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    statDivider: {
      width: hairline,
      backgroundColor: c.line,
    },
    statValue: {
      fontFamily: f.semibold,
      fontSize: 15,
      letterSpacing: -0.2,
      color: c.ink,
    },
    statLabel: {
      fontFamily: f.regular,
      fontSize: 10,
      color: c.soft,
      textAlign: 'center',
    },
    goingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 20,
      marginTop: 14,
    },
    goingAvatars: {
      flexDirection: 'row',
    },
    goingAvatar: {
      borderWidth: 2,
      borderColor: c.canvas,
      borderRadius: 14,
    },
    goingAvatarShift: {
      marginLeft: -9,
    },
    goingText: {
      flex: 1,
      fontFamily: f.regular,
      fontSize: 11,
      lineHeight: 16,
      color: c.muted,
    },
    donation: {
      marginHorizontal: 20,
      marginTop: 18,
      padding: 16,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
      gap: 9,
    },
    donationTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    donationLabel: {
      fontFamily: f.semibold,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: c.mint700,
    },
    donationPercent: {
      fontFamily: f.bold,
      fontSize: 18,
      letterSpacing: -0.4,
      color: c.ink,
    },
    donationMeta: {
      fontFamily: f.regular,
      fontSize: 11,
      lineHeight: 17,
      color: c.muted,
    },
    descriptionBlock: {
      paddingHorizontal: 20,
      gap: 8,
    },
    description: {
      fontFamily: f.regular,
      fontSize: 13,
      lineHeight: 21,
      color: c.muted,
    },
    more: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingVertical: 4,
    },
    moreText: {
      fontFamily: f.semibold,
      fontSize: 11,
      color: c.mint700,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    tag: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
    },
    tagText: {
      fontFamily: f.regular,
      fontSize: 10,
      color: c.muted,
    },
    reviewSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    average: {
      fontFamily: f.bold,
      fontSize: 36,
      lineHeight: 38,
      letterSpacing: -1.2,
      color: c.ink,
    },
    reviewCount: {
      fontFamily: f.regular,
      fontSize: 10,
      color: c.soft,
      marginTop: 3,
    },
    reviewForm: {
      marginHorizontal: 20,
      padding: 16,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
      gap: 12,
    },
    formLabel: {
      fontFamily: f.medium,
      fontSize: 11,
      color: c.muted,
    },
    reviewInput: {
      minHeight: 96,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.canvas,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: f.regular,
      fontSize: 13,
      lineHeight: 20,
      color: c.ink,
      textAlignVertical: 'top',
    },
    formFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    charCount: {
      fontFamily: f.regular,
      fontSize: 10,
      color: c.soft,
    },
    success: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    successText: {
      fontFamily: f.medium,
      fontSize: 11,
      color: c.mint700,
    },
    signInPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      padding: 16,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
    },
    signInIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.mint50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInText: {
      flex: 1,
      gap: 2,
    },
    signInTitle: {
      fontFamily: f.semibold,
      fontSize: 13,
      color: c.ink,
    },
    signInBody: {
      fontFamily: f.regular,
      fontSize: 11,
      lineHeight: 16,
      color: c.muted,
    },
    orgPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 28,
      paddingTop: 18,
      borderTopWidth: hairline,
      borderTopColor: c.line,
    },
    orgText: {
      flex: 1,
      gap: 2,
    },
    orgLabel: {
      fontFamily: f.regular,
      fontSize: 10,
      color: c.soft,
    },
    orgName: {
      fontFamily: f.semibold,
      fontSize: 13,
      color: c.ink,
    },
    orgInitials: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orgInitialsText: {
      fontFamily: f.semibold,
      fontSize: 10,
      color: c.muted,
    },
    loading: {
      paddingHorizontal: 20,
      paddingTop: 2,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: c.paper,
      borderTopWidth: hairline,
      borderTopColor: c.line,
    },
    footerPrice: {
      flex: 1,
      gap: 1,
    },
    footerLabel: {
      fontFamily: f.regular,
      fontSize: 10,
      color: c.soft,
    },
    footerValue: {
      fontFamily: f.semibold,
      fontSize: 16,
      letterSpacing: -0.3,
      color: c.ink,
    },
    footerButton: {
      minWidth: 150,
      borderRadius: radius.pill,
      paddingHorizontal: 24,
    },
    pressed: {
      opacity: 0.75,
    },

  });
}

const stylesByMode: Record<ThemeMode, ReturnType<typeof buildStyles>> = {
  light: buildStyles(light),
  dark: buildStyles(dark),
};

function useDetailTheme() {
  const { mode, colors } = useThemeMode();
  return { mode, c: colors, styles: stylesByMode[mode] };
}
