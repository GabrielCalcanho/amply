/**
 * AMPLY Design System — tokens visuais
 * Identidade: preto / branco / cinzas neutros
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

/** Light — white canvas, black type, neutral gray surfaces */
export const lightColors: ColorTokens = {
  primary: '#111111',
  primaryDark: '#000000',
  primaryLight: '#F0F0F0',
  primaryMuted: '#777777',
  background: '#F4F4F4',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEEEEE',
  surfaceElevated: '#FFFFFF',
  border: '#E2E2E2',
  borderStrong: '#CFCFCF',
  divider: '#EAEAEA',
  text: '#111111',
  textSecondary: '#555555',
  textMuted: '#888888',
  textInverse: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  charcoal: '#222222',
  danger: '#333333',
  dangerLight: '#E8E8E8',
  success: '#333333',
  successLight: '#E8E8E8',
  warning: '#333333',
  warningLight: '#E8E8E8',
  info: '#555555',
  infoLight: '#E8E8E8',
  overlay: 'rgba(0, 0, 0, 0.45)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E2E2',
  headerBg: '#F4F4F4',
  headerText: '#111111',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
};

/** Dark — charcoal canvas, white type, neutral gray surfaces */
export const darkColors: ColorTokens = {
  primary: '#FFFFFF',
  primaryDark: '#FFFFFF',
  primaryLight: '#2A2A2A',
  primaryMuted: '#AAAAAA',
  background: '#111111',
  surface: '#1B1B1B',
  surfaceSecondary: '#242424',
  surfaceElevated: '#2A2A2A',
  border: '#333333',
  borderStrong: '#444444',
  divider: '#2B2B2B',
  text: '#F5F5F5',
  textSecondary: '#B5B5B5',
  textMuted: '#808080',
  textInverse: '#111111',
  white: '#FFFFFF',
  black: '#000000',
  charcoal: '#E5E5E5',
  danger: '#FFFFFF',
  dangerLight: '#333333',
  success: '#FFFFFF',
  successLight: '#333333',
  warning: '#FFFFFF',
  warningLight: '#333333',
  info: '#B5B5B5',
  infoLight: '#333333',
  overlay: 'rgba(0, 0, 0, 0.6)',
  tabBar: '#1B1B1B',
  tabBarBorder: '#333333',
  headerBg: '#111111',
  headerText: '#F5F5F5',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
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
