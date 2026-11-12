import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Screen, Skeleton, StateBlock } from '@/components/ui';
import { getEvent } from '@/lib/api';
import { buildTiers, MAX_TICKETS, SECTIONS, type TicketTier } from '@/lib/tickets';
import { useAuth } from '@/lib/auth';
import { formatCompactPrice, formatMoney } from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { c, f, hairline, radius } from '@/theme';

const BLOCK_WIDTH = 42;
const BLOCK_HEIGHT = 28;
const MAP_HEIGHT = 244;

export default function TicketScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const key = typeof slug === 'string' ? slug : '';
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const eventQuery = useQuery(() => getEvent(key), [key], key.length > 0);
  const event = eventQuery.data;
  const tiers = useMemo(() => (event ? buildTiers(event) : []), [event]);

  const [tierId, setTierId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [section, setSection] = useState('A');

  const tier = tiers.find((item) => item.id === tierId) ?? tiers[0] ?? null;

  const canBuy = event?.status === 'published' || event?.status === 'ongoing';
  const maxQuantity = event?.capacity && event.capacity > 0
    ? Math.min(MAX_TICKETS, event.capacity)
    : MAX_TICKETS;
  const total = (tier?.price ?? 0) * quantity;
  const checkoutDisabled = !event || !canBuy;
  const mapWidth = Math.min(Math.max(width - 40, 272), 460);

  const checkoutLabel = !canBuy
    ? 'Tiket belum tersedia'
    : !isAuthenticated
      ? 'Masuk untuk melanjutkan'
      : tier?.price === 0
        ? 'Lanjut ke checkout'
        : 'Lanjut ke pembayaran';

  const chooseTier = (next: TicketTier) => {
    if (next.id === tier?.id) {
      return;
    }
    setTierId(next.id);
    setQuantity(1);
  };

  const adjustQuantity = (delta: number) => {
    setQuantity((current) => Math.min(maxQuantity, Math.max(1, current + delta)));
  };

  const cycleSection = (delta: number) => {
    setSection((current) => {
      const index = Math.max(0, SECTIONS.indexOf(current));
      return SECTIONS[(index + delta + SECTIONS.length) % SECTIONS.length];
    });
  };

  const checkout = () => {
    if (!event || !tier || !canBuy) {
      return;
    }
    if (!isAuthenticated) {
      router.push({
        pathname: '/masuk',
        params: { next: `/events/${event.slug}/tiket` },
      });
      return;
    }
    router.push({
      pathname: '/events/[slug]/checkout',
      params: { slug: event.slug, tier: tier.id, area: section, quantity: String(quantity) },
    });
  };

  if (eventQuery.loading) {
    return (
      <Screen>
        <Header title="Pilih Tiket" />
        <View style={styles.loading}>
          <Skeleton height={20} width="55%" />
          <Skeleton height={MAP_HEIGHT} radius={40} style={{ marginTop: 18 }} />
          <Skeleton height={180} radius={radius.xl} style={{ marginTop: 18 }} />
          <Skeleton height={52} radius={radius.pill} style={{ marginTop: 18 }} />
        </View>
      </Screen>
    );
  }

  if (eventQuery.errorStatus === 404) {
    return (
      <Screen>
        <Header title="Pilih Tiket" />
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
        <Header title="Pilih Tiket" />
        <StateBlock
          title="Tiket belum bisa dimuat"
          body={eventQuery.error ?? 'Terjadi kesalahan saat memuat data.'}
          icon="cloud-offline-outline"
          action="Coba lagi"
          onAction={eventQuery.reload}
        />
      </Screen>
    );
  }

  const venueName = event.venue_name || 'Lokasi menyusul';
  const venueCity = event.city || '';

  return (
    <Screen>
      <Header title="Pilih Tiket" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.venueRow}>
          <View style={styles.venueIcon}>
            <Ionicons name="location" size={16} color={c.mint700} />
          </View>
          <View style={styles.venueText}>
            <Text style={styles.venueName} numberOfLines={1}>
              {venueName}
            </Text>
            {venueCity ? (
              <Text style={styles.venueCity} numberOfLines={1}>
                {venueCity}
              </Text>
            ) : null}
          </View>
        </View>

        {!canBuy ? (
          <Text style={styles.venueWarn}>
            Event ini tidak sedang menjual tiket. Pemesanan dinonaktifkan.
          </Text>
        ) : null}

        {tiers.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tierRow}
          >
            {tiers.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                active={item.id === tier?.id}
                onPress={() => chooseTier(item)}
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.mapWrap}>
          <StadiumMap width={mapWidth} active={section} onSelect={setSection} />
          <Text style={styles.mapHint}>Ketuk area di peta untuk melihat detail.</Text>
        </View>

        <View style={styles.areaCard}>
          <View style={styles.areaHead}>
            <Pressable
              onPress={() => cycleSection(-1)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Area sebelumnya"
              style={({ pressed }) => [styles.areaArrow, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={18} color={c.ink} />
            </Pressable>
            <View style={styles.areaTitleWrap}>
              <Text style={styles.areaName}>Area {section}</Text>
              <Text style={styles.areaTier} numberOfLines={1}>
                {tier?.name ?? 'Tiket'}
              </Text>
            </View>
            <Pressable
              onPress={() => cycleSection(1)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Area berikutnya"
              style={({ pressed }) => [styles.areaArrow, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-forward" size={18} color={c.ink} />
            </Pressable>
          </View>

          <View style={styles.areaBody}>
            <Text style={styles.areaLabel}>Detail area</Text>
            <Text style={styles.areaDescription}>
              {tier?.description ?? 'Detail area mengikuti jenis tiket yang dipilih.'}
            </Text>
            {tier?.perks.map((perk) => (
              <View key={perk} style={styles.perk}>
                <Ionicons name="checkmark" size={12} color={c.mint700} />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

          <View style={styles.areaPriceRow}>
            <View style={styles.areaPriceText}>
              <Text style={styles.priceLabel}>Harga</Text>
              <Text style={styles.priceValue}>
                {!tier || tier.price === 0
                  ? 'Gratis'
                  : formatCompactPrice(tier.price, event.currency)}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => adjustQuantity(-1)}
                disabled={!canBuy || quantity <= 1}
                accessibilityRole="button"
                accessibilityLabel="Kurangi jumlah tiket"
                style={({ pressed }) => [
                  styles.stepButton,
                  (!canBuy || quantity <= 1) && styles.stepDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="remove" size={18} color={!canBuy || quantity <= 1 ? c.soft : c.ink} />
              </Pressable>
              <Text style={styles.stepValue}>{quantity}</Text>
              <Pressable
                onPress={() => adjustQuantity(1)}
                disabled={!canBuy || quantity >= maxQuantity}
                accessibilityRole="button"
                accessibilityLabel="Tambah jumlah tiket"
                style={({ pressed }) => [
                  styles.stepButton,
                  (!canBuy || quantity >= maxQuantity) && styles.stepDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={!canBuy || quantity >= maxQuantity ? c.soft : c.ink}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.limit}>Maksimal {maxQuantity} tiket per pesanan.</Text>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color={c.muted} />
          <Text style={styles.noteText}>
            Checkout masih berupa pratinjau. Pembayaran dan penerbitan tiket belum tersedia.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerLabel}>Total · {quantity} tiket</Text>
          <Text style={styles.footerValue}>{formatMoney(total, event.currency)}</Text>
        </View>
        <Button
          label={checkoutLabel}
          onPress={checkout}
          disabled={checkoutDisabled}
          style={styles.footerButton}
        />
      </View>

    </Screen>
  );
}

function StadiumMap({
  width,
  active,
  onSelect,
}: {
  width: number;
  active: string;
  onSelect: (zone: string) => void;
}) {
  const centerX = width / 2;
  const centerY = MAP_HEIGHT / 2 + 8;
  const radiusX = width / 2 - 26;
  const radiusY = MAP_HEIGHT / 2 - 42;

  const blocks = Array.from({ length: 12 }, (_, index) => {
    const angle = ((-62 + index * 27) * Math.PI) / 180;
    return {
      index,
      zone: SECTIONS[Math.floor(index / 4)],
      left: centerX + radiusX * Math.cos(angle) - BLOCK_WIDTH / 2,
      top: centerY + radiusY * Math.sin(angle) - BLOCK_HEIGHT / 2,
    };
  });

  return (
    <View style={[styles.map, { width, height: MAP_HEIGHT }]}>
      <View style={styles.stage}>
        <Text style={styles.stageText}>PANGGUNG</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldText}>ARENA</Text>
      </View>

      {blocks.map((block) => {
        const selected = block.zone === active;
        return (
          <Pressable
            key={block.index}
            onPress={() => onSelect(block.zone)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Zona ${block.zone}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.block,
              { left: block.left, top: block.top },
              selected && styles.blockActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.blockDots}>
              {[0, 1, 2, 3, 4, 5].map((dot) => (
                <View key={dot} style={[styles.blockDot, selected && styles.blockDotActive]} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <BackButton />
      <Text style={styles.headerTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <Ionicons name="arrow-back" size={20} color={c.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  venueIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueText: {
    flex: 1,
    gap: 1,
  },
  venueName: {
    fontFamily: f.semibold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: c.ink,
  },
  venueCity: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.muted,
  },
  venueWarn: {
    fontFamily: f.regular,
    fontSize: 11,
    lineHeight: 17,
    color: c.crimson,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tierRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  mapWrap: {
    alignItems: 'center',
    paddingTop: 16,
  },
  map: {
    borderRadius: 999,
    backgroundColor: c.wash,
    borderWidth: 1,
    borderColor: c.mint100,
  },
  stage: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    width: 104,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: c.mint700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageText: {
    fontFamily: f.semibold,
    fontSize: 8,
    letterSpacing: 2.4,
    color: c.paper,
  },
  field: {
    position: 'absolute',
    top: MAP_HEIGHT / 2 + 8 - 38,
    alignSelf: 'center',
    width: 116,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.mint100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldText: {
    fontFamily: f.semibold,
    fontSize: 8,
    letterSpacing: 2,
    color: c.soft,
  },
  block: {
    position: 'absolute',
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.mint200,
    backgroundColor: c.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockActive: {
    backgroundColor: c.mint700,
    borderColor: c.mint700,
  },
  blockDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 18,
    gap: 2,
  },
  blockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.mint300,
  },
  blockDotActive: {
    backgroundColor: c.mint200,
  },
  mapHint: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
    marginTop: 10,
  },
  areaCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    overflow: 'hidden',
  },
  areaHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: hairline,
    borderBottomColor: c.line,
  },
  areaArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  areaName: {
    fontFamily: f.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: c.ink,
  },
  areaTier: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.muted,
  },
  areaBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 6,
  },
  areaLabel: {
    fontFamily: f.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.mint700,
  },
  areaDescription: {
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 18,
    color: c.muted,
    marginBottom: 2,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkText: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.muted,
  },
  areaPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: hairline,
    borderTopColor: c.line,
    backgroundColor: c.canvas,
  },
  areaPriceText: {
    gap: 1,
  },
  priceLabel: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
  },
  priceValue: {
    fontFamily: f.bold,
    fontSize: 16,
    letterSpacing: -0.4,
    color: c.ink,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    overflow: 'hidden',
  },
  stepButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.45,
  },
  stepValue: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: f.semibold,
    fontSize: 14,
    color: c.ink,
  },
  limit: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginHorizontal: 20,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: hairline,
    borderTopColor: c.line,
  },
  noteText: {
    flex: 1,
    fontFamily: f.regular,
    fontSize: 10,
    lineHeight: 16,
    color: c.soft,
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
  footerTotal: {
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
    fontSize: 15,
    letterSpacing: -0.2,
    color: c.ink,
  },
  footerButton: {
    minWidth: 168,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
