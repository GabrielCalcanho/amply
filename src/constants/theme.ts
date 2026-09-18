/**
 * AMPLY Design System — tokens visuais
 * Identidade: carvão / off-white / verde oliva
 * Minimalista, premium, musical, acolhedor
 */

export type ColorTokens = {
  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;

  // Surfaces
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;

  // Borders
  border: string;
  borderStrong: string;
  divider: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Neutrals
  white: string;
  black: string;
  charcoal: string;

  // Semantic
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  // Chrome
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  headerBg: string;
  headerText: string;
  cardShadow: string;
};

/** Light — off-white base, charcoal text, olive accent */
export const lightColors: ColorTokens = {
  primary: '#5C6B4A',
  primaryDark: '#4A563C',
  primaryLight: '#E8EDE3',
  primaryMuted: '#8A9A76',

  background: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0EEE9',
  surfaceElevated: '#FFFFFF',

  border: '#E5E2DB',
  borderStrong: '#D4D0C8',
  divider: '#EBE8E2',

  text: '#1A1C19',
  textSecondary: '#5C5F58',
  textMuted: '#8B8E86',
  textInverse: '#FFFFFF',

  white: '#FFFFFF',
  black: '#0D0E0C',
  charcoal: '#2C2F2A',

  danger: '#B91C1C',
  dangerLight: '#FEE2E2',
  success: '#3F6B45',
  successLight: '#E4EDE5',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  info: '#3B5B7A',
  infoLight: '#E4EBF2',

  overlay: 'rgba(26, 28, 25, 0.45)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E2DB',
  headerBg: '#F7F6F3',
  headerText: '#1A1C19',
  cardShadow: 'rgba(26, 28, 25, 0.06)',
};

/** Dark — deep charcoal base, soft olive accent */
export const darkColors: ColorTokens = {
  primary: '#9BB084',
  primaryDark: '#7A8F68',
  primaryLight: '#2A3226',
  primaryMuted: '#6B7C5A',

  background: '#121411',
  surface: '#1A1D18',
  surfaceSecondary: '#222620',
  surfaceElevated: '#242822',

  border: '#2E332C',
  borderStrong: '#3D433A',
  divider: '#2A2E28',

  text: '#F2F1ED',
  textSecondary: '#A8ABA4',
  textMuted: '#6F736C',
  textInverse: '#121411',

  white: '#FFFFFF',
  black: '#0D0E0C',
  charcoal: '#E8E7E3',

  danger: '#F87171',
  dangerLight: '#3F1D1D',
  success: '#86B891',
  successLight: '#1A2E1E',
  warning: '#FBBF24',
  warningLight: '#3B2F0E',
  info: '#93B4D4',
  infoLight: '#1A2838',

  overlay: 'rgba(0, 0, 0, 0.55)',
  tabBar: '#1A1D18',
  tabBarBorder: '#2E332C',
  headerBg: '#121411',
  headerText: '#F2F1ED',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
};

/** @deprecated Prefer useTheme().colors */
export const colors = lightColors;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

/** Shadows intentionally subtle — premium, not flashy */
export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#1A1C19',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1C19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#1A1C19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
