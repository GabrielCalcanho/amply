import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography } from '../constants/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const letter = (name || '?').charAt(0).toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={[
        styles.ph,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceSecondary,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.4, color: colors.primaryDark }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ph: { alignItems: 'center', justifyContent: 'center' },
  letter: { ...typography.bodyMedium, fontWeight: '700' },
});
