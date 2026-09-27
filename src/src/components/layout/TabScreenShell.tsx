import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface TabScreenShellProps {
  children: React.ReactNode;
}

/** Simple full-screen shell for tab roots — background from theme */
export function TabScreenShell({ children }: TabScreenShellProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
