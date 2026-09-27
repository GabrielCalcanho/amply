import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../constants/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'inverse';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors } = useTheme();

  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceSecondary, fg: colors.textSecondary },
    success: { bg: colors.successLight, fg: colors.success },
    warning: { bg: colors.warningLight, fg: colors.warning },
    danger: { bg: colors.dangerLight, fg: colors.danger },
    info: { bg: colors.infoLight, fg: colors.info },
    inverse: { bg: colors.surfaceInverse, fg: colors.textInverse },
  };

  const { bg, fg } = map[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.full }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
