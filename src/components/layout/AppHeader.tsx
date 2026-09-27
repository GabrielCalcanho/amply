import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawer } from '../../contexts/DrawerContext';
import { Avatar } from '../Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { spacing, hitSlop } from '../../constants/theme';

interface AppHeaderProps {
  /** Show AMPLY wordmark (home) */
  brand?: boolean;
  title?: string;
  showNotifications?: boolean;
  showAvatar?: boolean;
  /** Show the leading menu button that opens the navigation drawer */
  showMenu?: boolean;
  right?: React.ReactNode;
}

export function AppHeader({
  brand = false,
  title,
  showNotifications = true,
  showAvatar = true,
  showMenu = true,
  right,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { openDrawer } = useDrawer();
  const { profile } = useAuth();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leading}>
          {showMenu ? (
            <Pressable
              onPress={openDrawer}
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Abrir menu"
              style={({ pressed }) => [styles.menuBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="menu-outline" size={24} color={colors.text} />
            </Pressable>
          ) : null}
          {brand ? (
            <Text style={[styles.brand, { color: colors.text }]}>AMPLY</Text>
          ) : (
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {right}
          {showNotifications ? (
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={hitSlop}
              style={({ pressed }) => [
                styles.iconBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
            </Pressable>
          ) : null}
          {showAvatar ? (
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              hitSlop={hitSlop}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <Avatar uri={profile?.avatar_url} name={profile?.name} size={36} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    width: 40,
    height: 40,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
