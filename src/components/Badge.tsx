import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, typography } from '../constants/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary';

export function Badge({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const { colors } = useTheme();
  const map: Record<BadgeVariant, { bg: string; fg: string }> = {
    default: { bg: colors.surfaceSecondary, fg: colors.textSecondary },
    success: { bg: colors.successLight, fg: colors.success },
    warning: { bg: colors.warningLight, fg: colors.warning },
    danger: { bg: colors.dangerLight, fg: colors.danger },
    primary: { bg: colors.primaryLight, fg: colors.primaryDark },
  };
  const t = map[variant];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  text: { ...typography.small, fontWeight: '600' },
});
