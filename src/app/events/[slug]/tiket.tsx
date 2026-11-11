import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen, Sheet, Skeleton, StateBlock } from '@/components/ui';
import { EVENT_TYPE_LABEL, getEvent, type Event } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCompactPrice, formatMoney, formatTimeRange } from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { c, f, hairline, radius } from '@/theme';

const MAX_TICKETS = 4;
const OCCUPIED_RATIO = 0.28;
const SEAT_ROWS = 3;
const SEATS_PER_ROW = 8;
const SECTIONS = ['A', 'B', 'C'];

interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  seats: boolean;
  perks: string[];
}

interface Seat {
  id: string;
  occupied: boolean;
}

interface Order {
  code: string;
  tierName: string;
  quantity: number;
  seats: string[];
  total: number;
  currency: string;
}

function hashRatio(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

function buildTiers(event: Event): TicketTier[] {
  if ((event.price_max ?? 0) <= 0) {
    return [
      {
        id: 'gratis',
        name: 'Registrasi gratis',
        description: 'Konfirmasi kehadiran tanpa biaya tiket.',
        price: 0,
        seats: false,
        perks: ['Akses ke area acara', 'Konfirmasi kehadiran digital'],
      },
    ];
  }
  if ((event.price_min ?? 0) === (event.price_max ?? 0)) {
    return [
      {
        id: 'reguler',
        name: 'Tiket reguler',
        description: 'Satu harga untuk seluruh area acara.',
        price: event.price_min,
        seats: false,
        perks: ['Akses area acara', 'E-tiket dengan kode pemesanan'],
      },
    ];
  }
  if (event.type !== 'concert') {
    return [
      {
        id: 'reguler',
        name: 'Tiket reguler',
        description: 'Akses area acara dengan harga dasar.',
        price: event.price_min,
        seats: false,
        perks: ['Akses area acara', 'E-tiket dengan kode pemesanan'],
      },
      {
        id: 'utama',
        name: 'Tiket utama',
        description: 'Akses area acara dengan harga dukungan lebih tinggi.',
        price: event.price_max,
        seats: false,
        perks: ['Akses area acara', 'E-tiket dengan kode pemesanan'],
      },
    ];
  }
  return [
    {
      id: 'cat-1',
      name: 'CAT 1',
      description: 'Area paling dekat dengan panggung.',
      price: event.price_max,
      seats: true,
      perks: ['Baris depan area panggung', 'Kursi bernomor', 'E-tiket dengan kode pemesanan'],
    },
    {
      id: 'cat-2',
      name: 'CAT 2',
      description: 'Area tengah dengan pandangan luas.',
      price: event.price_min,
      seats: true,
      perks: ['Area tengah tribun', 'Kursi bernomor', 'E-tiket dengan kode pemesanan'],
    },
  ];
}

function buildSeats(eventId: string, tier: TicketTier, section: string): Seat[] {
  const zone = tier.id === 'cat-1' ? 1 : 2;
  const seats: Seat[] = [];
  for (let row = 0; row < SEAT_ROWS; row += 1) {
    for (let index = 0; index < SEATS_PER_ROW; index += 1) {
      const id = `${zone}${section}-${row + 1}${String(index + 1).padStart(2, '0')}`;
      seats.push({
        id,
        occupied:
          hashRatio(`${eventId}:${tier.id}:${section}:${row}:${index}`) < OCCUPIED_RATIO,
      });
    }
  }
  return seats;
}

export default function TicketScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const key = typeof slug === 'string' ? slug : '';
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const eventQuery = useQuery(() => getEvent(key), [key], key.length > 0);
  const event = eventQuery.data;
  const tiers = useMemo(() => (event ? buildTiers(event) : []), [event]);

  const [tierId, setTierId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [section, setSection] = useState('A');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatNotice, setSeatNotice] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const tier = tiers.find((item) => item.id === tierId) ?? tiers[0] ?? null;

  const seats = useMemo(
    () => (event && tier?.seats ? buildSeats(event.id, tier, section) : []),
    [event, tier, section],
  );

  const canBuy = event?.status === 'published' || event?.status === 'ongoing';
  const maxQuantity = event?.capacity && event.capacity > 0
    ? Math.min(MAX_TICKETS, event.capacity)
    : MAX_TICKETS;
  const total = (tier?.price ?? 0) * quantity;
  const seatsIncomplete = tier?.seats === true && selectedSeats.length !== quantity;
  const checkoutDisabled = !event || !canBuy || seatsIncomplete;

  const remainingSeats = quantity - selectedSeats.length;
  const checkoutLabel = !canBuy
    ? 'Tiket belum tersedia'
    : seatsIncomplete
      ? selectedSeats.length === 0
        ? 'Pilih kursi dulu'
        : `Pilih ${remainingSeats} kursi lagi`
      : !isAuthenticated
        ? 'Masuk untuk melanjutkan'
        : tier?.price === 0
          ? 'Konfirmasi kehadiran'
          : 'Lanjut ke pembayaran';

  const chooseTier = (next: TicketTier) => {
    if (next.id === tier?.id) {
      return;
    }
    setTierId(next.id);
    setQuantity(1);
    setSelectedSeats([]);
    setSeatNotice(null);
    setSection('A');
  };

  const adjustQuantity = (delta: number) => {
    const next = Math.min(maxQuantity, Math.max(1, quantity + delta));
    if (next === quantity) {
      return;
    }
    setQuantity(next);
    setSelectedSeats((current) => current.slice(0, next));
    setSeatNotice(null);
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.occupied) {
      return;
    }
    setSeatNotice(null);
    setSelectedSeats((current) => {
      if (current.includes(seat.id)) {
        return current.filter((id) => id !== seat.id);
      }
      if (current.length >= quantity) {
        setSeatNotice(`Kamu memilih ${quantity} tiket. Lepas satu kursi sebelum menambah.`);
        return current;
      }
      return [...current, seat.id];
    });
  };

  const pickBestSeats = () => {
    if (!tier?.seats) {
      return;
    }
    const pool: string[] = [];
    for (const zone of SECTIONS) {
      for (const seat of buildSeats(event?.id ?? '', tier, zone)) {
        if (!seat.occupied && !pool.includes(seat.id)) {
          pool.push(seat.id);
        }
      }
    }
    const picked = pool.slice(0, quantity);
    setSelectedSeats(picked);
    setSeatNotice(
      picked.length < quantity ? 'Kursi di area ini tidak cukup untuk jumlah tiket.' : null,
    );
    if (picked.length > 0) {
      setSection(picked[0].slice(1, 2));
    }
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
    if (tier.seats && seatsIncomplete) {
      setSeatNotice('Pilih kursi sesuai jumlah tiket sebelum melanjutkan.');
      return;
    }
    setOrder({
      code: `FRY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      tierName: tier.name,
      quantity,
      seats: [...selectedSeats],
      total: tier.price * quantity,
      currency: event.currency || 'IDR',
    });
  };

  if (eventQuery.loading) {
    return (
      <Screen>
        <View style={styles.topBar}>
          <BackButton />
        </View>
        <View style={styles.loading}>
          <Skeleton height={90} radius={radius.lg} />
          <Skeleton height={110} radius={radius.lg} style={{ marginTop: 16 }} />
          <Skeleton height={48} radius={radius.md} style={{ marginTop: 16 }} />
          <Skeleton height={200} radius={radius.lg} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  if (eventQuery.errorStatus === 404) {
    return (
      <Screen>
        <View style={styles.topBar}>
          <BackButton />
        </View>
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
        <View style={styles.topBar}>
          <BackButton />
        </View>
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

  return (
    <Screen>
      <View style={styles.topBar}>
        <BackButton />
        <View style={styles.topBarText}>
          <Text style={styles.topBarKicker}>Pilih tiket</Text>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryType}>
            {EVENT_TYPE_LABEL[event.type] ?? 'Event'} ·{' '}
            {formatTimeRange(event.starts_at, event.ends_at)}
          </Text>
          <Text style={styles.summaryVenue} numberOfLines={2}>
            {[event.venue_name, event.city].filter(Boolean).join(', ') || 'Lokasi menyusul'}
          </Text>
          {!canBuy ? (
            <Text style={styles.summaryWarn}>
              Event ini tidak sedang menjual tiket. Pemesanan dinonaktifkan.
            </Text>
          ) : null}
        </View>

        <Text style={styles.groupLabel}>Jenis tiket</Text>
        <View style={styles.tiers}>
          {tiers.map((item) => {
            const active = item.id === tier?.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => chooseTier(item)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={({ pressed }) => [
                  styles.tier,
                  active && styles.tierActive,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.tierHead}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.tierText}>
                    <Text style={styles.tierName}>{item.name}</Text>
                    <Text style={styles.tierDescription}>{item.description}</Text>
                  </View>
                  <Text style={styles.tierPrice}>
                    {item.price === 0 ? 'Gratis' : formatCompactPrice(item.price, event.currency)}
                  </Text>
                </View>
                <View style={styles.perks}>
                  {item.perks.map((perk) => (
                    <View key={perk} style={styles.perk}>
                      <Ionicons name="checkmark" size={12} color={c.mint700} />
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quantityRow}>
          <View>
            <Text style={styles.quantityLabel}>Jumlah tiket</Text>
            <Text style={styles.quantityHint}>Maksimal {maxQuantity} tiket per pesanan</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => adjustQuantity(-1)}
              disabled={quantity <= 1}
              accessibilityRole="button"
              accessibilityLabel="Kurangi jumlah tiket"
              style={({ pressed }) => [
                styles.stepButton,
                quantity <= 1 && styles.stepDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="remove" size={18} color={quantity <= 1 ? c.soft : c.ink} />
            </Pressable>
            <Text style={styles.stepValue}>{quantity}</Text>
            <Pressable
              onPress={() => adjustQuantity(1)}
              disabled={quantity >= maxQuantity}
              accessibilityRole="button"
              accessibilityLabel="Tambah jumlah tiket"
              style={({ pressed }) => [
                styles.stepButton,
                quantity >= maxQuantity && styles.stepDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={18} color={quantity >= maxQuantity ? c.soft : c.ink} />
            </Pressable>
          </View>
        </View>

        {tier?.seats ? (
          <>
            <View style={styles.seatHead}>
              <Text style={styles.groupLabel}>Pilih kursi</Text>
              <Pressable onPress={pickBestSeats} hitSlop={8} accessibilityRole="button">
                <Text style={styles.autoPick}>Pilih otomatis</Text>
              </Pressable>
            </View>

            <View style={styles.sectionRow}>
              {SECTIONS.map((zone) => (
                <Pressable
                  key={zone}
                  onPress={() => setSection(zone)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: section === zone }}
                  style={({ pressed }) => [
                    styles.sectionChip,
                    section === zone && styles.sectionChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionChipText,
                      section === zone && styles.sectionChipTextActive,
                    ]}
                  >
                    Zona {tier.id === 'cat-1' ? '1' : '2'}
                    {zone}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.stageWrap}>
              <View style={styles.stage}>
                <Text style={styles.stageText}>PANGGUNG</Text>
              </View>
            </View>

            <View style={styles.seatGrid}>
              {seats.map((seat) => {
                const selected = selectedSeats.includes(seat.id);
                return (
                  <Pressable
                    key={seat.id}
                    onPress={() => toggleSeat(seat)}
                    disabled={seat.occupied}
                    hitSlop={3}
                    accessibilityRole="button"
                    accessibilityLabel={`Kursi ${seat.id}${seat.occupied ? ' terisi' : selected ? ' dipilih' : ' tersedia'}`}
                    accessibilityState={{ selected, disabled: seat.occupied }}
                    style={({ pressed }) => [
                      styles.seat,
                      seat.occupied && styles.seatOccupied,
                      selected && styles.seatSelected,
                      pressed && !seat.occupied && styles.pressed,
                    ]}
                  >
                    {selected ? <Ionicons name="checkmark" size={13} color={c.paper} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legend}>
              <Legend color={c.paper} border label="Tersedia" />
              <Legend color={c.mint50} label="Terisi" />
              <Legend color={c.mint700} label="Dipilih" />
            </View>

            <View style={styles.seatStrip}>
              <Text style={styles.seatStripLabel}>Kursi kamu</Text>
              <Text style={styles.seatStripValue}>
                {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Belum dipilih'}
              </Text>
            </View>

            {seatNotice ? <Text style={styles.seatNotice}>{seatNotice}</Text> : null}
          </>
        ) : null}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color={c.muted} />
          <Text style={styles.noteText}>
            Pemesanan di aplikasi ini masih berupa simulasi. Backend Fayrly belum memproses
            pembayaran atau menerbitkan tiket sungguhan.
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

      <Sheet visible={order !== null} onClose={() => setOrder(null)}>
        {order ? (
          <View style={styles.orderSheet}>
            <View style={styles.orderIcon}>
              <Ionicons name="checkmark" size={24} color={c.mint700} />
            </View>
            <Text style={styles.orderTitle}>Pesanan disimulasikan</Text>
            <Text style={styles.orderNote}>Belum ada transaksi nyata yang diproses.</Text>

            <View style={styles.orderCode}>
              <Text style={styles.orderCodeLabel}>Kode pemesanan</Text>
              <Text style={styles.orderCodeValue}>{order.code}</Text>
            </View>

            <View style={styles.orderRows}>
              <OrderRow label="Event" value={event.title} />
              <OrderRow label="Tiket" value={order.tierName} />
              <OrderRow label="Jumlah" value={`${order.quantity} tiket`} />
              {order.seats.length > 0 ? (
                <OrderRow label="Kursi" value={order.seats.join(', ')} />
              ) : null}
              <OrderRow label="Total" value={formatMoney(order.total, order.currency)} />
            </View>

            <Button
              label="Mengerti"
              onPress={() => setOrder(null)}
              style={styles.orderButton}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Legend({
  color,
  border,
  label,
}: {
  color: string;
  border?: boolean;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color },
          border && styles.legendBorder,
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.orderRow}>
      <Text style={styles.orderRowLabel}>{label}</Text>
      <Text style={styles.orderRowValue} numberOfLines={2}>
        {value}
      </Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topBarText: {
    flex: 1,
    gap: 1,
  },
  topBarKicker: {
    fontFamily: f.medium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.mint700,
  },
  topBarTitle: {
    fontFamily: f.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: c.ink,
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
  },
  summary: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    gap: 4,
  },
  summaryType: {
    fontFamily: f.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: c.mint700,
  },
  summaryVenue: {
    fontFamily: f.medium,
    fontSize: 13,
    lineHeight: 19,
    color: c.ink,
  },
  summaryWarn: {
    fontFamily: f.regular,
    fontSize: 11,
    lineHeight: 17,
    color: c.crimson,
    marginTop: 4,
  },
  groupLabel: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: c.ink,
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
  },
  tiers: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tier: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    padding: 14,
    gap: 10,
  },
  tierActive: {
    borderColor: c.mint600,
    backgroundColor: c.wash,
  },
  tierHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.mint300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioActive: {
    borderColor: c.mint700,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.mint700,
  },
  tierText: {
    flex: 1,
    gap: 2,
  },
  tierName: {
    fontFamily: f.semibold,
    fontSize: 14,
    color: c.ink,
  },
  tierDescription: {
    fontFamily: f.regular,
    fontSize: 11,
    lineHeight: 16,
    color: c.muted,
  },
  tierPrice: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: c.ink,
  },
  perks: {
    gap: 4,
    paddingLeft: 30,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkText: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.muted,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: hairline,
    borderTopColor: c.line,
  },
  quantityLabel: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: c.ink,
  },
  quantityHint: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
    marginTop: 2,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.5,
  },
  stepValue: {
    minWidth: 26,
    textAlign: 'center',
    fontFamily: f.semibold,
    fontSize: 14,
    color: c.ink,
  },
  seatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  autoPick: {
    fontFamily: f.semibold,
    fontSize: 11,
    color: c.mint700,
    marginTop: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  sectionChip: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionChipActive: {
    backgroundColor: c.mint700,
    borderColor: c.mint700,
  },
  sectionChipText: {
    fontFamily: f.medium,
    fontSize: 11,
    color: c.muted,
  },
  sectionChipTextActive: {
    color: c.paper,
  },
  stageWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stage: {
    height: 26,
    borderRadius: 13,
    backgroundColor: c.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageText: {
    fontFamily: f.semibold,
    fontSize: 8,
    letterSpacing: 3,
    color: c.mint700,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: 20,
    paddingTop: 14,
    justifyContent: 'center',
  },
  seat: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: c.mint200,
    backgroundColor: c.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatOccupied: {
    backgroundColor: c.mint50,
    borderColor: c.mint50,
  },
  seatSelected: {
    backgroundColor: c.mint700,
    borderColor: c.mint700,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendBorder: {
    borderWidth: 1,
    borderColor: c.mint200,
  },
  legendText: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.muted,
  },
  seatStrip: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    gap: 3,
  },
  seatStripLabel: {
    fontFamily: f.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: c.soft,
  },
  seatStripValue: {
    fontFamily: f.medium,
    fontSize: 12,
    lineHeight: 18,
    color: c.ink,
  },
  seatNotice: {
    fontFamily: f.regular,
    fontSize: 11,
    lineHeight: 17,
    color: c.crimson,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginHorizontal: 20,
    marginTop: 22,
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
  },
  orderSheet: {
    gap: 8,
    paddingBottom: 8,
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitle: {
    fontFamily: f.semibold,
    fontSize: 19,
    letterSpacing: -0.3,
    color: c.ink,
  },
  orderNote: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.muted,
  },
  orderCode: {
    marginTop: 10,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: c.wash,
    gap: 2,
  },
  orderCodeLabel: {
    fontFamily: f.medium,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.soft,
  },
  orderCodeValue: {
    fontFamily: f.bold,
    fontSize: 16,
    letterSpacing: 1,
    color: c.mint700,
  },
  orderRows: {
    marginTop: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: hairline,
    borderBottomColor: c.line,
  },
  orderRowLabel: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.soft,
  },
  orderRowValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: f.medium,
    fontSize: 11,
    color: c.ink,
  },
  orderButton: {
    marginTop: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
