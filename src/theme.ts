import { StyleSheet } from 'react-native';

export const c = {
  canvas: '#F4FBF7',
  paper: '#FFFFFF',
  wash: '#EDF7F1',
  mint50: '#DEF5E5',
  mint100: '#BCEAD5',
  mint200: '#9ED5C5',
  mint300: '#8EC3B0',
  mint600: '#2E7D68',
  mint700: '#1F6B57',
  ink: '#12261F',
  muted: '#5B6B66',
  soft: '#8B9A95',
  line: '#E3EEE8',
  crimson: '#C8174F',
  crimsonSoft: '#FCE9EF',
};

export type Colors = typeof c;

export const dark: Colors = {
  canvas: '#0F1713',
  paper: '#17221C',
  wash: '#1C2A23',
  mint50: '#20342B',
  mint100: '#28453A',
  mint200: '#3C6B5A',
  mint300: '#548C77',
  mint600: '#63B49B',
  mint700: '#8ADCC2',
  ink: '#E9F4EE',
  muted: '#A9BEB5',
  soft: '#7C948B',
  line: '#25362E',
  crimson: '#FF6B93',
  crimsonSoft: '#3B1C29',
};

export const f = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export const hairline = StyleSheet.hairlineWidth;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const display = {
  fontFamily: f.bold,
  fontSize: 30,
  lineHeight: 35,
  letterSpacing: -0.8,
  color: c.ink,
} as const;

export const title = {
  fontFamily: f.semibold,
  fontSize: 18,
  lineHeight: 24,
  letterSpacing: -0.3,
  color: c.ink,
} as const;

export const body = {
  fontFamily: f.regular,
  fontSize: 14,
  lineHeight: 21,
  color: c.muted,
} as const;

export const kicker = {
  fontFamily: f.semibold,
  fontSize: 10,
  lineHeight: 14,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  color: c.mint700,
} as const;

export const hit = {
  minHeight: 44,
  minWidth: 44,
} as const;
