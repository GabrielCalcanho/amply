import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { EmptyState } from '../components/EmptyState';
import { useTheme } from '../contexts/ThemeContext';
import { ColorTokens } from '../constants/theme';

export function MessagesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TabScreenShell>
      <View style={styles.body}>
        <EmptyState
          title="Mensagens"
          description="Central de comunicação em preparação. Use Avisos no menu ☰ para comunicados do ministério."
        />
      </View>
    </TabScreenShell>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({ body: { flex: 1, backgroundColor: colors.background } });
}
