import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/use-query';
import { useThemeMode, type ThemeMode } from '@/lib/theme-mode';
import { c as light, f, radius, dark, type Colors } from '@/theme';

const TILE = 256;
const MAP_HEIGHT = 188;
const PIN = 40;
const FAILED = 'Periksa koneksi internet kamu, lalu coba lagi.';
// OSM tile policy rejects anonymous native clients; browsers send their own UA.
const TILE_HEADERS = Platform.OS === 'web' ? undefined : { 'User-Agent': 'Fayrly/1.0 (event app)' };

type Point = { lat: number; lon: number; zoom: number };
type Lookup = { q: string; zoom: number };

const cache = new Map<string, Point | null>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(lookups: Lookup[], country: string): Promise<Point | null> {
  let fetched = false;
  for (const { q, zoom } of lookups) {
    const cacheKey = `${country}|${q}`;
    if (cache.has(cacheKey)) {
      const hit = cache.get(cacheKey);
      if (hit) {
        return hit;
      }
      continue;
    }
    // Nominatim allows at most one request per second.
    if (fetched) {
      await wait(1100);
    }
    fetched = true;
    const params = new URLSearchParams({ format: 'json', limit: '1', q, 'accept-language': 'id' });
    if (country) {
      params.set('countrycodes', country);
    }
    let rows: { lat: string; lon: string }[];
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) {
        throw new Error(FAILED);
      }
      rows = await response.json();
    } catch {
      throw new Error(FAILED);
    }
    const first = rows[0];
    const point = first ? { lat: Number(first.lat), lon: Number(first.lon), zoom } : null;
    cache.set(cacheKey, point);
    if (point) {
      return point;
    }
  }
  return null;
}

function project(lat: number, lon: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale,
  };
}

function tilesFor(point: Point, width: number, height: number) {
  const center = project(point.lat, point.lon, point.zoom);
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const count = 2 ** point.zoom;
  const tiles: { key: string; uri: string; left: number; top: number }[] = [];
  for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height - 1) / TILE); ty += 1) {
    if (ty < 0 || ty >= count) {
      continue;
    }
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width - 1) / TILE); tx += 1) {
      const wrapped = ((tx % count) + count) % count;
      tiles.push({
        key: `${tx}-${ty}`,
        uri: `https://tile.openstreetmap.org/${point.zoom}/${wrapped}/${ty}.png`,
        left: tx * TILE - left,
        top: ty * TILE - top,
      });
    }
  }
  return tiles;
}

type VenueMapProps = {
  venueName?: string;
  venueAddress?: string;
  city?: string;
  country?: string;
};

export function VenueMap(props: VenueMapProps) {
  // Remount per location so a previous venue's point never lingers while the next one loads.
  const key = [props.venueName, props.venueAddress, props.city, props.country].join('|');
  return <VenueMapView key={key} {...props} />;
}

function VenueMapView({ venueName, venueAddress, city, country }: VenueMapProps) {
  const { c, styles } = useVenueMapTheme();
  const [width, setWidth] = useState(0);

  const name = venueName?.trim() ?? '';
  const address = venueAddress?.trim() ?? '';
  const town = city?.trim() ?? '';
  const lookups: Lookup[] = [];
  const add = (parts: string[], zoom: number) => {
    const q = parts.filter(Boolean).join(', ');
    if (q && !lookups.some((item) => item.q === q)) {
      lookups.push({ q, zoom });
    }
  };
  if (name) {
    add([name, address, town], 16);
    add([name, town], 16);
  }
  if (address) {
    add([address, town], 16);
  }
  add([town], 12);

  const countryCode = (country ?? '').trim().toLowerCase();
  const key = `${countryCode}#${lookups.map((item) => item.q).join('|')}`;
  const query = useQuery(() => geocode(lookups, countryCode), [key], lookups.length > 0);
  const point = query.data;
  const label = name || town || 'Lokasi event';

  if (lookups.length === 0) {
    return (
      <MapNotice
        icon="location-outline"
        title="Lokasi menyusul"
        body="Penyelenggara belum menambahkan lokasi event ini."
      />
    );
  }

  if (query.loading) {
    return (
      <View style={styles.wrap}>
        <Skeleton height={MAP_HEIGHT} radius={radius.lg} />
      </View>
    );
  }

  if (!point) {
    return query.error ? (
      <MapNotice
        icon="cloud-offline-outline"
        title="Peta belum bisa dimuat"
        body={query.error}
        action="Coba lagi"
        onAction={query.reload}
      />
    ) : (
      <MapNotice
        icon="map-outline"
        title="Lokasi belum ditemukan di peta"
        body={`${label} belum punya titik peta yang bisa ditampilkan.`}
      />
    );
  }

  const approximate = point.zoom < 16;
  const openMap = () => {
    const { lat, lon } = point;
    Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
    ).catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openMap}
        accessibilityRole="link"
        accessibilityLabel={`Peta lokasi ${label}. Ketuk untuk membuka peta lengkap.`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
      >
        {width > 0
          ? tilesFor(point, width, MAP_HEIGHT).map((tile) => (
              <Image
                key={tile.key}
                source={{ uri: tile.uri, headers: TILE_HEADERS }}
                style={[styles.tile, { left: tile.left, top: tile.top }]}
                cachePolicy="memory-disk"
                transition={150}
                accessible={false}
              />
            ))
          : null}

        <View pointerEvents="none" style={styles.pinShadow} />
        <View pointerEvents="none" style={styles.pin}>
          <Ionicons name="location" size={PIN} color={c.crimson} />
        </View>

        <View pointerEvents="none" style={styles.label}>
          <Text style={styles.labelName} numberOfLines={1}>
            {label}
          </Text>
          {approximate ? <Text style={styles.labelNote}>Titik perkiraan area kota</Text> : null}
        </View>

        <View pointerEvents="none" style={styles.expand}>
          <Ionicons name="expand-outline" size={16} color={c.ink} />
        </View>

        <Text pointerEvents="none" style={styles.attribution}>
          © OpenStreetMap
        </Text>
      </Pressable>
    </View>
  );
}

function MapNotice({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { c, styles } = useVenueMapTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.notice}>
        <View style={styles.noticeIcon}>
          <Ionicons name={icon} size={22} color={c.mint700} />
        </View>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeBody}>{body}</Text>
        {action && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            style={({ pressed }) => [styles.noticeAction, pressed && styles.pressed]}
          >
            <Text style={styles.noticeActionText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles(c: Colors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: 20,
    },
    card: {
      height: MAP_HEIGHT,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.wash,
      overflow: 'hidden',
    },
    pressed: {
      opacity: 0.85,
    },
    tile: {
      position: 'absolute',
      width: TILE,
      height: TILE,
    },
    pin: {
      position: 'absolute',
      left: '50%',
      top: MAP_HEIGHT / 2 - PIN + 4,
      marginLeft: -PIN / 2,
    },
    pinShadow: {
      position: 'absolute',
      left: '50%',
      top: MAP_HEIGHT / 2 - 2,
      width: 14,
      height: 5,
      marginLeft: -7,
      borderRadius: 7,
      backgroundColor: c.ink,
      opacity: 0.25,
    },
    label: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      maxWidth: '72%',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    labelName: {
      fontFamily: f.semibold,
      fontSize: 12,
      lineHeight: 17,
      color: c.ink,
    },
    labelNote: {
      fontFamily: f.regular,
      fontSize: 10,
      lineHeight: 14,
      color: c.muted,
    },
    expand: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    attribution: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderTopLeftRadius: 6,
      backgroundColor: c.paper,
      opacity: 0.85,
      fontFamily: f.regular,
      fontSize: 9,
      color: c.muted,
    },
    notice: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
    },
    noticeIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.mint50,
      marginBottom: 4,
    },
    noticeTitle: {
      fontFamily: f.semibold,
      fontSize: 13,
      color: c.ink,
      textAlign: 'center',
    },
    noticeBody: {
      fontFamily: f.regular,
      fontSize: 12,
      lineHeight: 18,
      color: c.muted,
      textAlign: 'center',
    },
    noticeAction: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    noticeActionText: {
      fontFamily: f.semibold,
      fontSize: 12,
      color: c.mint700,
    },
  });
}

const stylesByMode: Record<ThemeMode, ReturnType<typeof buildStyles>> = {
  light: buildStyles(light),
  dark: buildStyles(dark),
};

function useVenueMapTheme() {
  const { mode, colors } = useThemeMode();
  return { mode, c: colors, styles: stylesByMode[mode] };
}
