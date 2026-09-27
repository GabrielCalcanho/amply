import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../constants/theme';

type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'inverse'
  | 'primary'; // alias → inverse (black bg / white text)

interface BadgeProps {
  label: string;
  tone?: Tone | string | null;
}

/**
 * High-contrast status chip.
 * Invalid/unknown tones fall back to neutral — never crash.
 */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors } = useTheme();

  const safeLabel = label != null ? String(label) : '';

  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceSecondary, fg: colors.text },
    success: { bg: '#E8F5EE', fg: '#0F5C32' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    danger: { bg: '#FEE2E2', fg: '#991B1B' },
    info: { bg: colors.surfaceSecondary, fg: colors.text },
    inverse: { bg: colors.primary, fg: colors.textInverse },
    primary: { bg: colors.primary, fg: colors.textInverse },
    // common status aliases
    scheduled: { bg: colors.surfaceSecondary, fg: colors.text },
    confirmed: { bg: '#E8F5EE', fg: '#0F5C32' },
    pending: { bg: '#FEF3C7', fg: '#92400E' },
    cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
    completed: { bg: colors.surfaceSecondary, fg: colors.textSecondary },
  };

  const key = (tone || 'neutral').toString().toLowerCase();
  const palette = tones[key] ?? tones.neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.fg }]} numberOfLines={1}>
        {safeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
