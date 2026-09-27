import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { useAmplyTheme } from './theme';
import { type } from './tokens';

export type TabItem = { key: string; label: string; icon: IconName };

/**
 * Barra inferior independente de biblioteca: quem usa decide o que fazer no `onPress`.
 * Com React Navigation, use-a via a prop `tabBar` do Bottom Tab Navigator
 * (exemplo no README).
 */
export function BottomTabBar({
  items,
  activeKey,
  onPress,
}: {
  items: TabItem[];
  activeKey: string;
  onPress: (key: string) => void;
}) {
  const { colors } = useAmplyTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const tint = active ? colors.foreground : colors.subtle;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => onPress(item.key)}
            style={styles.tab}
          >
            <Icon name={item.icon} size={20} color={tint} />
            <Text style={[type.tab, { color: tint, fontWeight: active ? '700' : '500' }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50 },
});
