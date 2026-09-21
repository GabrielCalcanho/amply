import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawer } from '../../contexts/DrawerContext';
import { spacing, typography } from '../../constants/theme';

/**
 * Menu icon: two lines → X when open.
 * Native-driver safe (transform only).
 */
function MenuIcon({ open, color }: { open: boolean; color: string }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const topRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  const bottomRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg'],
  });
  const topY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-3.5, 0],
  });
  const bottomY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3.5, 0],
  });
  const bottomScaleX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });
  const bottomTX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(18 * (1 - 0.55)) / 2, 0],
  });

  return (
    <View style={menuStyles.box}>
      <Animated.View
        style={[
          menuStyles.lineFull,
          {
            backgroundColor: color,
            transform: [{ translateY: topY }, { rotate: topRotate }],
          },
        ]}
      />
      <Animated.View
        style={[
          menuStyles.lineFull,
          {
            backgroundColor: color,
            transform: [
              { translateY: bottomY },
              { translateX: bottomTX },
              { scaleX: bottomScaleX },
              { rotate: bottomRotate },
            ],
          },
        ]}
      />
    </View>
  );
}

const menuStyles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  lineFull: {
    position: 'absolute',
    left: 2,
    width: 18,
    height: 2,
    borderRadius: 1,
  },
});

/** [ MENU ]  AMPLY  [ NOTIF ] — header neutro, sem barra colorida */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { open, toggle } = useDrawer();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 4,
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={toggle}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityLabel={open ? 'Fechar menu' : 'Abrir menu'}
        >
          <MenuIcon open={open} color={colors.headerText} />
        </TouchableOpacity>

        <View style={styles.logoCenter} pointerEvents="none">
          <Text style={[styles.wordmark, { color: colors.headerText }]}>
            AMPLY
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityLabel="Notificações"
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={colors.headerText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    position: 'relative',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logoCenter: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
