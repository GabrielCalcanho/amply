import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppHeader } from './AppHeader';
import { useTheme } from '../../contexts/ThemeContext';

/** Shell for tab roots: themed header + content. Drawer lives in DrawerProvider. */
export function TabScreenShell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
