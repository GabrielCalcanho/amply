import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing } from '../constants/theme';

interface Option<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.row, scrollable && { paddingHorizontal: spacing.md }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active
                  ? colors.segmentActiveBg
                  : colors.segmentInactiveBg,
                opacity: pressed ? 0.9 : 1,
                borderRadius: radius.full,
                borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.segmentActiveText : colors.segmentInactiveText,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 2 }}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
