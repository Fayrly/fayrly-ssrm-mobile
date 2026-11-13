import { PaymentPicker, type PaymentChoice } from '@/components/payment-picker';
import { Button, ErrorBanner, NoticeModal, Screen, Skeleton, StateBlock } from '@/components/ui';
import { getEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatLongDate, formatMoney, formatTimeRange } from '@/lib/format';
import { buildTiers, MAX_TICKETS, SECTIONS } from '@/lib/tickets';
import { useQuery } from '@/lib/use-query';
import { c, f, hairline, radius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CheckoutParams = { slug?: string; tier?: string; area?: string; quantity?: string };

export default function CheckoutScreen() {
  const params = useLocalSearchParams<CheckoutParams>();
  return <Checkout key={JSON.stringify(params)} params={params} />;
}

function Checkout({ params }: { params: CheckoutParams }) {
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const eventQuery = useQuery(() => getEvent(slug), [slug], slug.length > 0);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [payment, setPayment] = useState<PaymentChoice | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const event = eventQuery.data;

  const backToTickets = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (slug) {
      router.replace({ pathname: '/events/[slug]/tiket', params: { slug } });
    } else {
      router.replace('/');
    }
  };

  if (eventQuery.loading) {
    return (
      <Screen>
        <Header onBack={backToTickets} />
        <View style={styles.content}>
          <Skeleton height={20} width="45%" />
          <Skeleton height={170} radius={radius.lg} />
          <Skeleton height={110} radius={radius.lg} />
          <Skeleton height={20} width="60%" style={{ marginTop: 12 }} />
          <Skeleton height={76} radius={radius.lg} />
          <Skeleton height={76} radius={radius.lg} />
          <Skeleton height={76} radius={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (!event) {
    const missing = !slug || eventQuery.errorStatus === 404;
    return (
      <Screen>
        <Header onBack={backToTickets} />
        <StateBlock
          title={missing ? 'Event tidak ditemukan' : 'Checkout belum bisa dimuat'}
          body={missing ? 'Tautan mungkin sudah berubah atau event telah dihapus.' : eventQuery.error ?? 'Coba muat ulang detail event.'}
          icon={missing ? 'compass-outline' : 'cloud-offline-outline'}
          action={missing ? 'Kembali ke Beranda' : 'Coba lagi'}
          onAction={missing ? () => router.replace('/') : eventQuery.reload}
        />
      </Screen>
    );
  }

  const tier = buildTiers(event).find((item) => item.id === params.tier);
  const quantity = typeof params.quantity === 'string' && /^[1-9]\d*$/.test(params.quantity)
    ? Number(params.quantity)
    : 0;
  const maxQuantity = event.capacity > 0 ? Math.min(MAX_TICKETS, event.capacity) : MAX_TICKETS;
  const validSelection = tier && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= maxQuantity
    && typeof params.area === 'string' && SECTIONS.includes(params.area);
  const canBuy = event.status === 'published' || event.status === 'ongoing';

  if (!validSelection || !tier || !canBuy) {
    return (
      <Screen>
        <Header onBack={backToTickets} />
        <StateBlock
          title={canBuy ? 'Pilih tiket terlebih dahulu' : 'Tiket tidak tersedia'}
          body={canBuy ? 'Kategori, area, atau jumlah tiket tidak valid. Pilih kembali tiket kamu.' : 'Event ini tidak sedang menjual tiket. Checkout tidak dapat dilanjutkan.'}
          icon="ticket-outline"
          action={canBuy ? 'Pilih tiket' : 'Lihat detail event'}
          onAction={() => router.replace({
            pathname: canBuy ? '/events/[slug]/tiket' : '/events/[slug]',
            params: { slug: event.slug },
          })}
        />
      </Screen>
    );
  }

  const total = tier.price * quantity;
  const free = total === 0;
  const paymentLabel = payment?.method === 'bank'
    ? `Virtual Account · ${payment.bank}`
    : payment?.method === 'qris' ? 'QRIS' : payment?.method === 'gopay' ? 'GoPay' : 'Belum dipilih';
  const proceed = () => {
    if (!user || eventQuery.refreshing || eventQuery.error || (!free && !payment)) {
      return;
    }
    setNotice(free
      ? 'Registrasi tiket belum terhubung ke backend. Kehadiran kamu belum dicatat dan belum ada tiket yang diterbitkan.'
      : `${paymentLabel} dipilih untuk ${quantity} tiket dengan subtotal ${formatMoney(total, event.currency)}. Layanan pembayaran belum terhubung; belum ada pesanan, tagihan, atau tiket yang dibuat.`);
  };

  return (
    <Screen>
      <Header onBack={backToTickets} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={eventQuery.refreshing} onRefresh={eventQuery.reload} tintColor={c.mint700} />}
      >
        {eventQuery.error ? <ErrorBanner message={eventQuery.error} onRetry={eventQuery.reload} /> : null}
        <View style={styles.sectionHead}>
          <Text style={styles.heading}>Ringkasan tiket</Text>
          <Pressable onPress={backToTickets} accessibilityRole="button" style={styles.editButton}>
            <Text style={styles.editText}>Ubah</Text>
            <Ionicons name="chevron-forward" size={14} color={c.mint700} />
          </Pressable>
        </View>
        <View style={styles.ticketCard}>
          <View style={styles.eventRow}>
            {event.cover_image_url ? (
              <Image source={{ uri: event.cover_image_url }} style={styles.cover} contentFit="cover" accessibilityLabel={event.title} />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Ionicons name="ticket-outline" size={28} color={c.mint700} />
              </View>
            )}
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
              <Text style={styles.small}>{formatLongDate(event.starts_at)}</Text>
              <Text style={styles.small}>{formatTimeRange(event.starts_at, event.ends_at)}</Text>
              <Text style={styles.small} numberOfLines={2}>
                {[event.venue_name, event.city].filter(Boolean).join(', ') || 'Lokasi menyusul'}
              </Text>
            </View>
          </View>
          <View style={styles.ticketLine}>
            <Ionicons name="ticket-outline" size={18} color={c.mint700} />
            <Text style={styles.ticketName}>{tier.name} · Area {params.area}</Text>
            <Text style={styles.quantity}>{quantity} tiket</Text>
          </View>
        </View>

        <Text style={[styles.heading, styles.sectionGap]}>Data pemesan</Text>
        <View style={styles.buyerCard}>
          <View style={styles.buyerIcon}><Ionicons name="person-outline" size={20} color={c.mint700} /></View>
          <View style={styles.eventInfo}>
            <Text style={styles.buyerName}>{user?.name}</Text>
            <Text style={styles.small}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.sectionGap}>
          <Text style={styles.heading}>{free ? 'Tanpa pembayaran' : 'Metode pembayaran'}</Text>
          <Text style={[styles.small, styles.sectionCopy]}>
            {free ? 'Tiket ini gratis. Kamu tidak perlu memilih metode pembayaran.' : 'Pilih cara pembayaran yang kamu inginkan.'}
          </Text>
        </View>
        {!free ? <PaymentPicker value={payment} onChange={setPayment} /> : null}

        <Text style={[styles.heading, styles.sectionGap]}>Rincian biaya</Text>
        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{tier.name} × {quantity}</Text>
            <Text style={styles.costValue}>{formatMoney(total, event.currency)}</Text>
          </View>
          <Text style={styles.unitPrice}>{formatMoney(tier.price, event.currency)} / tiket</Text>
          {!free ? (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Biaya pembayaran</Text>
              <Text style={styles.small}>Belum tersedia</Text>
            </View>
          ) : null}
          <View style={[styles.costRow, styles.subtotalRow]}>
            <Text style={styles.subtotalLabel}>Subtotal tiket</Text>
            <Text style={styles.subtotalValue}>{formatMoney(total, event.currency)}</Text>
          </View>
          {!free ? <Text style={styles.small}>Belum termasuk biaya pembayaran.</Text> : null}
        </View>
        <View style={styles.previewNote}>
          <Ionicons name="information-circle-outline" size={18} color={c.muted} />
          <Text style={styles.previewText}>
            Ini pratinjau checkout. Pembayaran dan penerbitan tiket belum aktif. Pilihan metode belum membuat pesanan.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerText}>
          <Text style={styles.small}>Subtotal · {quantity} tiket</Text>
          <Text style={styles.footerValue}>{formatMoney(total, event.currency)}</Text>
          {!free ? <Text style={styles.footerMethod} numberOfLines={1}>{paymentLabel}</Text> : null}
        </View>
        <Button
          label="Lanjutkan"
          onPress={proceed}
          disabled={!user || (!free && !payment) || eventQuery.refreshing || Boolean(eventQuery.error)}
          style={styles.footerButton}
        />
      </View>
      <NoticeModal
        title={free ? 'Registrasi belum tersedia' : 'Pembayaran belum tersedia'}
        message={notice}
        onClose={() => setNotice(null)}
      />
    </Screen>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali ke tiket" style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
        <Ionicons name="arrow-back" size={20} color={c.ink} />
      </Pressable>
      <Text style={styles.headerTitle} accessibilityRole="header">Checkout</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: f.semibold, fontSize: 16, letterSpacing: -0.3, color: c.ink },
  headerSpacer: { width: 44 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: f.semibold, fontSize: 16, letterSpacing: -0.4, color: c.ink },
  sectionGap: { marginTop: 12 },
  sectionCopy: { marginTop: 4 },
  editButton: { minHeight: 44, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { fontFamily: f.medium, fontSize: 12, color: c.mint700 },
  ticketCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper, overflow: 'hidden' },
  eventRow: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'center' },
  cover: { width: 76, height: 96, borderRadius: radius.sm, backgroundColor: c.mint50 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontFamily: f.semibold, fontSize: 14, lineHeight: 21, color: c.ink, marginBottom: 4 },
  small: { fontFamily: f.regular, fontSize: 11, lineHeight: 17, color: c.muted },
  ticketLine: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: c.line, borderStyle: 'dashed', backgroundColor: c.canvas },
  ticketName: { flex: 1, fontFamily: f.medium, fontSize: 12, color: c.mint700 },
  quantity: { fontFamily: f.medium, fontSize: 11, color: c.muted },
  buyerCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line },
  buyerIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.mint50, alignItems: 'center', justifyContent: 'center' },
  buyerName: { fontFamily: f.medium, fontSize: 13, color: c.ink },
  costCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper, padding: 16, gap: 10 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  costLabel: { flex: 1, fontFamily: f.regular, fontSize: 12, color: c.muted },
  costValue: { fontFamily: f.medium, fontSize: 12, color: c.ink },
  unitPrice: { fontFamily: f.regular, fontSize: 10, color: c.muted, marginTop: -6 },
  subtotalRow: { borderTopWidth: hairline, borderTopColor: c.line, paddingTop: 14, marginTop: 2 },
  subtotalLabel: { fontFamily: f.semibold, fontSize: 13, color: c.ink },
  subtotalValue: { fontFamily: f.semibold, fontSize: 15, color: c.mint700 },
  previewNote: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  previewText: { flex: 1, fontFamily: f.regular, fontSize: 10, lineHeight: 16, color: c.muted },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, backgroundColor: c.paper, borderTopWidth: hairline, borderTopColor: c.line },
  footerText: { flex: 1, gap: 2 },
  footerValue: { fontFamily: f.semibold, fontSize: 16, color: c.ink, letterSpacing: -0.4 },
  footerMethod: { fontFamily: f.medium, fontSize: 10, color: c.mint700 },
  footerButton: { borderRadius: radius.pill, paddingHorizontal: 24, minWidth: 130 },
});
