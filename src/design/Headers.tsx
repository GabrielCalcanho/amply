import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HamburgerIcon } from './HamburgerIcon';
import { Icon } from './Icon';
import { useAmplyTheme } from './theme';
import { type } from './tokens';

/** Botão de ícone discreto (área de toque de 44pt). */
export function IconButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.5 }]}
    >
      {children}
    </Pressable>
  );
}

/** Topo da Home: menu de duas linhas, wordmark AMPLY e ações à direita. */
export function BrandHeader({
  onMenu,
  right,
}: {
  onMenu?: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useAmplyTheme();
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandLeft}>
        {onMenu ? (
          <IconButton label="Abrir menu" onPress={onMenu}>
            <HamburgerIcon />
          </IconButton>
        ) : null}
        <Text style={[type.wordmark, { color: colors.foreground }]}>AMPLY</Text>
      </View>
      <View style={styles.brandRight}>{right}</View>
    </View>
  );
}

/** Cabeçalho das demais telas: título alinhado à esquerda, voltar e ação opcionais. */
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useAmplyTheme();
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <IconButton label="Voltar" onPress={onBack}>
          <Icon name="chevron-left" size={24} />
        </IconButton>
      ) : null}
      <Text numberOfLines={1} style={[type.screenTitle, styles.screenTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <View style={styles.brandRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  brandRow: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLeft: { flexDirection: 'row', alignItems: 'center', marginLeft: -10, gap: 2 },
  brandRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  screenHeader: { height: 58, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  screenTitle: { flex: 1 },
});
