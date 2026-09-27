import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, typography } from '../constants/theme';

export function PillTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceSecondary }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            activeOpacity={0.85}
            style={[styles.item, active && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.label, { color: active ? colors.textInverse : colors.textSecondary }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radius.full, padding: 3, gap: 2 },
  item: { flex: 1, alignItems: 'center', borderRadius: radius.full, paddingVertical: spacing.sm },
  label: { ...typography.small, fontWeight: '600' },
});
