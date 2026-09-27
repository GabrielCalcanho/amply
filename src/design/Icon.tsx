import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useAmplyTheme } from './theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];

/** Ícones de traço fino (Feather, já incluído no Expo via @expo/vector-icons). */
export function Icon({
  name,
  size = 18,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useAmplyTheme();
  return <Feather name={name} size={size} color={color ?? colors.foreground} />;
}
