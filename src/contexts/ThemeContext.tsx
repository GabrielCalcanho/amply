import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
  ColorTokens,
  ThemeMode,
} from '../constants/theme';

const STORAGE_KEY = '@amply/theme-preference';

export type ThemeColors = ColorTokens;

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  theme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) {
          if (stored === 'light' || stored === 'dark' || stored === 'system') {
            setModeState(stored);
          } else if (stored === 'true' || stored === 'dark-mode') {
            setModeState('dark');
          } else if (stored === 'false') {
            setModeState('light');
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const setTheme = useCallback(
    (theme: 'light' | 'dark') => {
      setMode(theme);
    },
    [setMode]
  );

  const isDark = useMemo(() => {
    if (mode === 'system') return system === 'dark';
    return mode === 'dark';
  }, [mode, system]);

  const toggleTheme = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      scheme: isDark ? 'dark' : 'light',
      mode,
      theme: isDark ? 'dark' : 'light',
      setMode,
      setTheme,
      toggleTheme,
      toggle: toggleTheme,
    }),
    [isDark, mode, setMode, setTheme, toggleTheme]
  );

  if (!ready) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
