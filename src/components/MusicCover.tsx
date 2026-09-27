import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ColorTokens, radius } from '../constants/theme';

export function MusicCover({ uri, size = 156 }: { uri?: string | null; size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (uri) return <Image source={{ uri }} style={[styles.cover, { width: size, height: size }]} />;
  return <View style={[styles.placeholder, { width: size, height: size }]}><Ionicons name="musical-note" size={30} color={colors.textMuted} /></View>;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    cover: { borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
    placeholder: { borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  });
}
