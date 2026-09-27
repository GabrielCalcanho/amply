import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius } from '../constants/theme';

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionMenuItem[];
}

/**
 * Bottom-sheet style action menu.
 * Use for secondary actions: Editar, Duplicar, Compartilhar, Excluir.
 * Never show destructive actions as permanent red buttons on cards.
 */
export function ActionMenu({ visible, onClose, title, items }: ActionMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleItem = (item: ActionMenuItem) => {
    onClose();
    // slight delay so modal closes before alert/navigation
    setTimeout(() => item.onPress(), 80);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {title ? (
            <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
          ) : null}
          <ScrollView
            bounces={false}
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ paddingHorizontal: spacing.md }}
          >
            {items.map((item, idx) => (
              <Pressable
                key={item.key}
                onPress={() => handleItem(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                    borderBottomWidth: idx < items.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.divider,
                  },
                ]}
              >
                {item.icon ? (
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.destructive ? colors.danger : colors.text}
                    style={{ marginRight: 14 }}
                  />
                ) : null}
                <Text
                  style={[
                    styles.label,
                    { color: item.destructive ? colors.danger : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancel,
              {
                backgroundColor: colors.surfaceSecondary,
                opacity: pressed ? 0.85 : 1,
                marginHorizontal: spacing.md,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  cancel: {
    marginTop: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
