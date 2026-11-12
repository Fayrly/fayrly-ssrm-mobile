import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { c, f } from '@/theme';

export const SPLASH_LOGO_WIDTH = 200;
export const SPLASH_LOGO_HEIGHT = 72;

export function BrandSplash() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Image
        source={require('../../assets/images/splash-logo-light.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Fayrly"
      />
      <Text style={styles.tagline}>PT Fatamorgana Abadi Indah Harapan Angkasa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.mint700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: SPLASH_LOGO_WIDTH,
    height: SPLASH_LOGO_HEIGHT,
  },
  tagline: {
    fontFamily: f.semibold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: c.mint100,
    marginTop: 18,
  },
});
