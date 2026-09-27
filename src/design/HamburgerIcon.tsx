import React from 'react';
import { View } from 'react-native';
import { useAmplyTheme } from './theme';

/**
 * Menu hambúrguer de DUAS linhas.
 * `secondLineRatio` (0-1) é o comprimento da linha de baixo em relação à de cima (padrão 0.6: linha inferior menor).
 */
export function HamburgerIcon({
  size = 22,
  color,
  secondLineRatio = 0.6,
}: {
  size?: number;
  color?: string;
  secondLineRatio?: number;
}) {
  const { colors } = useAmplyTheme();
  const tint = color ?? colors.foreground;
  const thickness = 2;
  const gap = Math.max(4, Math.round(size / 4));
  return (
    <View style={{ width: size, alignItems: 'flex-start' }}>
      <View style={{ width: size, height: thickness, borderRadius: thickness, backgroundColor: tint }} />
      <View
        style={{
          marginTop: gap,
          width: size * secondLineRatio,
          height: thickness,
          borderRadius: thickness,
          backgroundColor: tint,
        }}
      />
    </View>
  );
}
