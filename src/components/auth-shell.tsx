import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/ui';
import { c, f } from '@/theme';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/masuk');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={20} color={c.ink} />
          </Pressable>
          <Image
            source={require('../../assets/images/logo-ink.png')}
            style={styles.brand}
            contentFit="contain"
            accessibilityLabel="Fayrly"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    width: 60,
    height: 22,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 32,
  },
  title: {
    fontFamily: f.bold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.8,
    color: c.ink,
  },
  subtitle: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    color: c.muted,
    marginTop: 8,
    maxWidth: 360,
  },
  form: {
    marginTop: 24,
    gap: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
