import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, ColorTokens } from '../../constants/theme';

export function ScreenHeader({
  title,
  showBack = true,
  right,
  onBack,
}: {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const top = Math.max(insets.top, Platform.OS === 'web' ? 8 : 0);

  const handleBack = () => {
    if (onBack) onBack();
    else if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.wrap, { paddingTop: top + 4 }]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{right ?? <View style={{ width: 72 }} />}</View>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingBottom: spacing.xs,
    },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: spacing.xs },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 72,
      minHeight: 44,
      paddingHorizontal: 4,
    },
    backText: { ...typography.body, color: colors.primary, marginLeft: -2 },
    title: { flex: 1, textAlign: 'center', ...typography.h3, color: colors.text },
    right: { minWidth: 72, alignItems: 'flex-end', justifyContent: 'center' },
  });
}
