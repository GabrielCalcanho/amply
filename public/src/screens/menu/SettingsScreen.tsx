import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, ThemePreference } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { spacing, radius, shadow } from '../../constants/theme';

type Row = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  soon?: boolean;
};

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { profile, church, membership, user, signOut } = useAuth();
  const { colors, preference, setPreference } = useTheme();

  const account: Row[] = [
    {
      key: 'profile_view',
      label: 'Perfil da conta',
      icon: 'person-outline',
      onPress: () =>
        navigation.navigate('MemberDetail', {
          userId: user?.id,
          memberId: membership?.id,
        }),
    },
    {
      key: 'profile_edit',
      label: 'Dados pessoais',
      icon: 'create-outline',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      key: 'link',
      label: 'Vincular conta',
      icon: 'link-outline',
      soon: true,
    },
  ];

  const other: Row[] = [
    {
      key: 'notifications',
      label: 'Notificações',
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      key: 'privacy',
      label: 'Privacidade',
      icon: 'shield-outline',
      soon: true,
    },
    {
      key: 'about',
      label: 'Sobre o AMPLY',
      icon: 'information-circle-outline',
      onPress: () =>
        Alert.alert('AMPLY', 'AMPLY — prepare-se para tocar.\nVersão 2.1.0'),
    },
  ];

  const renderSection = (title: string, rows: Row[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View
        style={[
          styles.group,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
            ...shadow.sm,
          },
        ]}
      >
        {rows.map((r, idx) => (
          <Pressable
            key={r.key}
            onPress={r.soon ? undefined : r.onPress}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomWidth: idx < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.divider,
                opacity: pressed && !r.soon ? 0.7 : r.soon ? 0.55 : 1,
              },
            ]}
          >
            <Ionicons name={r.icon} size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>{r.label}</Text>
            {r.soon ? (
              <Text style={[styles.soon, { color: colors.textMuted }]}>Em breve</Text>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Configurações" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.identity,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.xl,
              ...shadow.sm,
            },
          ]}
        >
          <Text style={[styles.identityName, { color: colors.text }]}>
            {profile?.name ?? 'Usuário'}
          </Text>
          <Text style={[styles.identityChurch, { color: colors.textSecondary }]}>
            {church?.name ?? 'Ministério'}
          </Text>
        </View>

        {renderSection('Conta', account)}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Aparência</Text>
          <View
            style={[
              styles.group,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.xl,
                padding: spacing.md,
                ...shadow.sm,
              },
            ]}
          >
            <Text style={[styles.themeLabel, { color: colors.textSecondary }]}>Tema</Text>
            <SegmentedControl
              options={[
                { key: 'light', label: 'Claro' },
                { key: 'dark', label: 'Escuro' },
                { key: 'system', label: 'Sistema' },
              ]}
              value={preference}
              onChange={(v) => setPreference(v as ThemePreference)}
            />
          </View>
        </View>

        {renderSection('Outras', other)}

        <Pressable
          style={styles.logout}
          onPress={() =>
            Alert.alert('Sair', 'Deseja sair da conta?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: signOut },
            ])
          }
        >
          <Text style={[styles.logoutText, { color: colors.danger }]}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  identity: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  identityName: { fontSize: 18, fontWeight: '700' },
  identityChurch: { fontSize: 13, marginTop: 4 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowText: { fontSize: 15, flex: 1 },
  soon: { fontSize: 12 },
  themeLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  logout: { marginTop: spacing.md, alignItems: 'center', padding: spacing.md },
  logoutText: { fontSize: 15, fontWeight: '600' },
});
