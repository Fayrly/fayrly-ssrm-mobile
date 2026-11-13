import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeMode } from '@/lib/theme-mode';
import { c as light, dark, f } from '@/theme';

const PLATE = 168;
const ROCKER_W = 88;
const ROCKER_H = 128;
const SEAM = 1;

export function LightSwitchCard() {
  const { mode, colors: c, toggle } = useThemeMode();
  const isDark = mode === 'dark';
  const [progress] = useState(() => new Animated.Value(isDark ? 1 : 0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: isDark ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isDark, progress]);

  const plateBg = progress.interpolate({ inputRange: [0, 1], outputRange: [light.paper, dark.paper] });
  const plateLine = progress.interpolate({ inputRange: [0, 1], outputRange: [light.line, dark.line] });
  const topBg = progress.interpolate({ inputRange: [0, 1], outputRange: [light.mint100, dark.wash] });
  const bottomBg = progress.interpolate({ inputRange: [0, 1], outputRange: [light.paper, dark.mint600] });
  const topHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [ROCKER_H / 2 + 4, ROCKER_H / 2 - 4],
  });
  const bottomHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [ROCKER_H / 2 - 4, ROCKER_H / 2 + 4],
  });
  const sunLit = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const sunDim = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const moonDim = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const moonLit = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: c.ink }]}>Mau mode terang atau gelap?</Text>
      <Text style={[styles.subtitle, { color: c.muted }]}>
        Nyalain atau matiin saklar sesuai keinginan
      </Text>

      <Pressable
        onPress={toggle}
        accessibilityRole="switch"
        aria-checked={isDark}
        accessibilityState={{ checked: isDark }}
        accessibilityLabel="Saklar mode gelap"
        accessibilityHint="Ketuk untuk mengganti mode terang atau gelap"
        hitSlop={8}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Animated.View
          style={[
            styles.plate,
            { backgroundColor: plateBg, borderColor: plateLine },
            isDark ? styles.plateShadowDark : styles.plateShadowLight,
          ]}
        >
          <Animated.View style={[styles.rocker, { borderColor: plateLine }]}>
            <Animated.View style={[styles.half, { height: topHeight, backgroundColor: topBg }]}>
              <Animated.View style={[styles.icon, { opacity: sunLit }]}>
                <Ionicons name="sunny" size={18} color={light.mint700} />
              </Animated.View>
              <Animated.View style={[styles.icon, { opacity: sunDim }]}>
                <Ionicons name="sunny" size={18} color={dark.soft} />
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.seam, { backgroundColor: plateLine }]} />
            <Animated.View style={[styles.half, { height: bottomHeight, backgroundColor: bottomBg }]}>
              <Animated.View style={[styles.icon, { opacity: moonDim }]}>
                <Ionicons name="moon" size={16} color={light.soft} />
              </Animated.View>
              <Animated.View style={[styles.icon, { opacity: moonLit }]}>
                <Ionicons name="moon" size={16} color={dark.canvas} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>

      <Text style={[styles.status, { color: c.muted }]}>
        {isDark ? 'Mode gelap aktif' : 'Mode terang aktif'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  title: { fontFamily: f.semibold, fontSize: 16, textAlign: 'center' },
  subtitle: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  plate: {
    width: PLATE,
    height: PLATE,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateShadowLight: {
    shadowColor: '#0F3D2E',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  plateShadowDark: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  rocker: {
    width: ROCKER_W,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  half: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seam: {
    height: SEAM,
  },
  icon: { position: 'absolute' },
  status: { fontFamily: f.medium, fontSize: 11, marginTop: 20 },
});
