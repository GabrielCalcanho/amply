/**
 * AMPLY Design System — premium minimal black & white
 * Single source of truth for color, type, space, radius, shadows.
 * Supports light and dark modes.
 */

export type ColorScheme = 'light' | 'dark';

const lightColors = {
  // Surfaces
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F0F0',
  surfaceElevated: '#FFFFFF',
  surfaceInverse: '#111111',

  // Text
  text: '#111111',
  textSecondary: '#6B6B6B',
  textMuted: '#999999',
  textInverse: '#FFFFFF',
  textOnInverse: '#FFFFFF',

  // Brand — pure black / neutral (no green, no blue primary)
  primary: '#111111',
  primaryDark: '#000000',
  primaryLight: '#333333',
  primaryMuted: '#E8E8E8',

  // Semantic (kept subtle)
  success: '#1A7F4B',
  successLight: '#E8F5EE',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  danger: '#C41E3A',
  dangerLight: '#FEE2E2',
  info: '#374151',
  infoLight: '#F3F4F6',

  // Chrome
  border: '#E8E8E8',
  borderStrong: '#D4D4D4',
  divider: '#E8E8E8',
  overlay: 'rgba(0, 0, 0, 0.45)',

  // Compat
  black: '#000000',
  white: '#FFFFFF',
  charcoal: '#111111',

  // Segmented / chips
  segmentActiveBg: '#111111',
  segmentActiveText: '#FFFFFF',
  segmentInactiveBg: '#EFEFEF',
  segmentInactiveText: '#111111',

  // Tab bar
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E8E8E8',
  tabActive: '#111111',
  tabInactive: '#999999',
};

const darkColors = {
  background: '#0B0B0B',
  surface: '#151515',
  surfaceSecondary: '#181818',
  surfaceElevated: '#1C1C1C',
  surfaceInverse: '#FFFFFF',

  text: '#FFFFFF',
  textSecondary: '#A5A5A5',
  textMuted: '#6B6B6B',
  textInverse: '#111111',
  textOnInverse: '#111111',

  primary: '#FFFFFF',
  primaryDark: '#E5E5E5',
  primaryLight: '#CCCCCC',
  primaryMuted: '#292929',

  success: '#34D399',
  successLight: '#0D2818',
  warning: '#FBBF24',
  warningLight: '#2A1F0A',
  danger: '#F87171',
  dangerLight: '#2A1215',
  info: '#A5A5A5',
  infoLight: '#1A1A1A',

  border: '#292929',
  borderStrong: '#3A3A3A',
  divider: '#292929',
  overlay: 'rgba(0, 0, 0, 0.65)',

  black: '#000000',
  white: '#FFFFFF',
  charcoal: '#FFFFFF',

  segmentActiveBg: '#FFFFFF',
  segmentActiveText: '#111111',
  segmentInactiveBg: '#1C1C1C',
  segmentInactiveText: '#A5A5A5',

  tabBarBg: '#0B0B0B',
  tabBarBorder: '#292929',
  tabActive: '#FFFFFF',
  tabInactive: '#6B6B6B',
};

export type ThemeColors = typeof lightColors;

export function getColors(scheme: ColorScheme): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

/** Default export for gradual migration — prefers light until ThemeContext is used */
export const colors = lightColors;

/** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 24,
  full: 999,
};

export const typography = {
  /** Screen title 20–24 / 700 */
  screenTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  /** Section title 16–18 / 700 */
  section: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  /** Card title 14–16 / 600–700 */
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  tiny: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  /** Important numbers */
  number: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
};

export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

/** Horizontal page padding */
export const pagePadding = spacing.md; // 16

/** Card padding */
export const cardPadding = spacing.md; // 16
