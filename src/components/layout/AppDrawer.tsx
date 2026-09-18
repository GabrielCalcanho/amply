import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, radius } from '../../constants/theme';

type DrawerItem = { label: string; icon: keyof typeof Ionicons.glyphMap; route: string };

const ITEMS: DrawerItem[] = [
  { label: 'Ministério', icon: 'business-outline', route: 'Ministry' },
  { label: 'Equipe', icon: 'people-outline', route: 'Team' },
  { label: 'Calendário', icon: 'calendar-outline', route: 'Calendar' },
  { label: 'Mensagens', icon: 'chatbubbles-outline', route: 'Messages' },
  { label: 'Visão geral', icon: 'grid-outline', route: 'Overview' },
  { label: 'Avisos', icon: 'megaphone-outline', route: 'Announcements' },
  { label: 'Indisponibilidade', icon: 'calendar-clear-outline', route: 'Unavailability' },
  { label: 'Panorama de escala', icon: 'stats-chart-outline', route: 'ScaleOverview' },
  { label: 'Aniversariantes', icon: 'gift-outline', route: 'Birthdays' },
  { label: 'Metrônomo', icon: 'speedometer-outline', route: 'Metronome' },
  { label: 'Planos', icon: 'card-outline', route: 'Plans' },
  { label: 'Configurações', icon: 'settings-outline', route: 'Settings' },
];

export function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  const fullName = profile?.name ?? 'Usuário';
  const email = user?.email ?? '';
  const initial = (fullName.charAt(0) || 'A').toUpperCase();

  const go = (route: string) => {
    onClose();
    setTimeout(() => navigation.navigate(route), 40);
  };

  const openProfile = () => {
    onClose();
    setTimeout(() => navigation.navigate('Tabs', { screen: 'Profile' }), 40);
  };

  const cardShadow = Platform.select({
    ios: {
      shadowColor: isDark ? '#000' : '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.panel,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* Avatar + nome + e-mail → Meu perfil (único acesso) */}
          <TouchableOpacity
            style={[
              styles.identity,
              { backgroundColor: colors.surface, borderColor: colors.border },
              cardShadow,
            ]}
            onPress={openProfile}
            activeOpacity={0.8}
            accessibilityLabel="Abrir meu perfil"
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarLetter, { color: colors.primaryDark }]}>{initial}</Text>
              </View>
            )}
            <View style={styles.identityText}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {fullName}
              </Text>
              {email ? (
                <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  cardShadow,
                ]}
                onPress={() => go(item.route)}
                activeOpacity={0.75}
              >
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row' },
  panel: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    paddingHorizontal: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '700' },
  identityText: { flex: 1, minWidth: 0 },
  userName: { ...typography.bodyMedium, fontSize: 16 },
  userEmail: { ...typography.caption, fontSize: 12, marginTop: 2 },
  list: { flex: 1 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemLabel: { ...typography.body, flex: 1 },
});
