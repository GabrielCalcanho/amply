import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, shadow } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  /** Inverse / dark card (e.g. important announcements) */
  inverse?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
  elevated = true,
  inverse = false,
}: CardProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: inverse ? colors.surfaceInverse : colors.surface,
          borderColor: inverse ? 'transparent' : colors.border,
          borderRadius: radius.xl,
          padding: padded ? spacing.md : 0,
          ...(elevated && !inverse ? shadow.sm : shadow.none),
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
