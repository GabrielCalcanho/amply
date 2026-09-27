import React from 'react';
import { RefreshControlProps, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAmplyTheme } from './theme';
import { spacing } from './tokens';

/**
 * Container de tela: fundo do tema, margem lateral de 20, respeito à área segura
 * e espaço no fim para a barra inferior. Use `scroll={false}` quando a tela já
 * tem uma FlatList própria (passe o padding via contentContainerStyle da lista).
 */
export function Screen({
  children,
  scroll = true,
  hasTabBar = true,
  refreshControl,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  hasTabBar?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAmplyTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingHorizontal: spacing.screenX,
    // A barra inferior fica no fluxo do layout (não absoluta), então só falta a área segura quando não há barra.
    paddingBottom: (hasTabBar ? 0 : insets.bottom) + spacing.tabBarClearance,
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={[padding, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}
