import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useColorScheme as useSystemColorScheme, Appearance } from 'react-native';
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

export type ThemePreference = 'light' | 'dark';

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
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(
    system === 'dark' ? 'dark' : 'light'
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!mounted) return;
        if (v === 'light' || v === 'dark') {
          setPreferenceState(v);
        } else if (v === 'system') {
          // legacy: map system → current device
          setPreferenceState(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Track system appearance changes for "system" preference
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    setSystemScheme(system === 'dark' ? 'dark' : 'light');
    return () => sub.remove();
  }, [system]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: ColorScheme = preference;

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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const colors = getColors('light');
    return {
      preference: 'light' as ThemePreference,
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
