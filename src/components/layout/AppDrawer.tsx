import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type DrawerItem = { label: string; icon: keyof typeof Ionicons.glyphMap; route: string };

const ITEMS: DrawerItem[] = [
  { label: 'Visão geral', icon: 'grid-outline', route: 'Overview' },
  { label: 'Calendário', icon: 'calendar-outline', route: 'Calendar' },
  { label: 'Avisos', icon: 'megaphone-outline', route: 'Announcements' },
  { label: 'Indisponibilidade', icon: 'calendar-clear-outline', route: 'Unavailability' },
  { label: 'Panorama de escala', icon: 'stats-chart-outline', route: 'ScaleOverview' },
  { label: 'Aniversariantes', icon: 'gift-outline', route: 'Birthdays' },
  { label: 'Metrônomo', icon: 'speedometer-outline', route: 'Metronome' },
  { label: 'Planos', icon: 'card-outline', route: 'Plans' },
  { label: 'Configurações', icon: 'settings-outline', route: 'Settings' },
];

const FOOTER_ITEMS: DrawerItem[] = [
  { label: 'Perfil', icon: 'person-outline', route: 'Profile' },
];

export function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { church, profile } = useAuth();

  const go = (route: string) => {
    onClose();
    setTimeout(() => navigation.navigate(route), 50);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>AMPLY</Text>
            <Text style={styles.church} numberOfLines={1}>
              {church?.name ?? 'Ministério'}
            </Text>
            {profile?.name ? (
              <Text style={styles.user} numberOfLines={1}>
                {profile.name}
              </Text>
            ) : null}
          </View>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {ITEMS.map((item) => (
              <TouchableOpacity key={item.route} style={styles.item} onPress={() => go(item.route)}>
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.itemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.divider} />
            {FOOTER_ITEMS.map((item) => (
              <TouchableOpacity key={item.route} style={styles.item} onPress={() => go(item.route)}>
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.itemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, flexDirection: 'row' },
  panel: {
    width: Platform.OS === 'web' ? 300 : '78%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    height: '100%',
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  brand: { fontSize: 18, fontWeight: '800', color: colors.primary, letterSpacing: 2 },
  church: { ...typography.body, color: colors.primary, marginTop: 4 },
  user: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  list: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    minHeight: 48,
  },
  itemLabel: { ...typography.body, color: colors.text },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.sm,
  },
});
