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
  | 'onInverse' // pill that stays visible on a surfaceInverse card (bg=surface)
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
    success: { bg: colors.successLight, fg: colors.success },
    warning: { bg: colors.warningLight, fg: colors.warning },
    danger: { bg: colors.dangerLight, fg: colors.danger },
    info: { bg: colors.infoLight, fg: colors.info },
    inverse: { bg: colors.primary, fg: colors.textInverse },
    onInverse: { bg: colors.surface, fg: colors.text },
    primary: { bg: colors.primary, fg: colors.textInverse },
    // common status aliases
    scheduled: { bg: colors.surfaceSecondary, fg: colors.text },
    confirmed: { bg: colors.successLight, fg: colors.success },
    pending: { bg: colors.warningLight, fg: colors.warning },
    cancelled: { bg: colors.dangerLight, fg: colors.danger },
    completed: { bg: colors.surfaceSecondary, fg: colors.textSecondary },
  };

  const key = (tone || 'neutral').toString();
  const palette = tones[key] ?? tones[key.toLowerCase()] ?? tones.neutral;

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
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
