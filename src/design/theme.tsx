import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { AmplyColors, darkColors, lightColors } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeValue = { colors: AmplyColors; isDark: boolean };

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Opcional. Sem o provider, `useAmplyTheme` segue o tema do sistema.
 * Se o app já tem um ThemeContext próprio, basta trocar o corpo de
 * `useAmplyTheme` para ler dele: é o único ponto de acoplamento.
 */
export function AmplyThemeProvider({
  mode = 'system',
  children,
}: {
  mode?: ThemeMode;
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';
  const value = useMemo<ThemeValue>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAmplyTheme(): ThemeValue {
  const scheme = useColorScheme();
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  const isDark = scheme === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}
