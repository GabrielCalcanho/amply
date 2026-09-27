import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ColorScheme,
  ThemeColors,
  getColors,
  spacing,
  radius,
  typography,
  shadow,
  hitSlop,
  pagePadding,
  cardPadding,
} from '../constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (p: ThemePreference) => void;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
  hitSlop: typeof hitSlop;
  pagePadding: number;
  cardPadding: number;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = '@amply/theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') {
          setPreferenceState(v);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const colors = useMemo(() => getColors(scheme), [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      scheme,
      colors,
      isDark: scheme === 'dark',
      setPreference,
      spacing,
      radius,
      typography,
      shadow,
      hitSlop,
      pagePadding,
      cardPadding,
    }),
    [preference, scheme, colors, setPreference]
  );

  // Avoid flash: still render children (default light) while loading preference
  if (!loaded) {
    // still provide context with defaults
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components outside provider (should not happen)
    const colors = getColors('light');
    return {
      preference: 'system' as ThemePreference,
      scheme: 'light' as ColorScheme,
      colors,
      isDark: false,
      setPreference: () => {},
      spacing,
      radius,
      typography,
      shadow,
      hitSlop,
      pagePadding,
      cardPadding,
    };
  }
  return ctx;
}
