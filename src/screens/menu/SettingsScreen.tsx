import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { spacing, typography, radius, ColorTokens, ThemeMode } from '../../constants/theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { signOut, church, profile } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const themes: { id: ThemeMode; label: string }[] = [
    { id: 'system', label: 'Sistema' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Configurações" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Text style={styles.identityName}>{profile?.name ?? 'Usuário'}</Text>
          <Text style={styles.identityChurch}>{church?.name ?? 'Ministério'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Aparência</Text>
        <View style={styles.themeRow}>
          {themes.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.themeChip, mode === t.id && styles.themeChipOn]}
              onPress={() => setMode(t.id)}
            >
              <Text style={[styles.themeText, mode === t.id && styles.themeTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Conta</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.rowText}>Meu perfil</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.rowText}>Notificações</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Ministério</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Overview')}>
          <Ionicons name="grid-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.rowText}>Visão geral</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Plans')}>
          <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.rowText}>Planos</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Integrações</Text>
        <View style={styles.row}>
          <Ionicons name="musical-notes-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.rowText, styles.disabled]}>Spotify</Text>
          <Text style={styles.soon}>Em breve</Text>
        </View>

        <TouchableOpacity
          style={styles.logout}
          onPress={() =>
            Alert.alert('Sair', 'Deseja sair da conta?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: signOut },
            ])
          }
        >
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xxxl },
    identity: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    identityName: { ...typography.h3, color: colors.text },
    identityChurch: { ...typography.caption, color: colors.primary, marginTop: 2 },
    sectionTitle: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
      marginLeft: 4,
      marginTop: spacing.md,
    },
    themeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
    themeChip: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeChipOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    themeText: { ...typography.bodyMedium, color: colors.textSecondary },
    themeTextOn: { color: colors.primaryDark },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
    },
    rowText: { ...typography.body, color: colors.text, flex: 1 },
    disabled: { color: colors.textMuted },
    soon: { ...typography.small, color: colors.textMuted },
    logout: { marginTop: spacing.xl, alignItems: 'center', padding: spacing.md },
    logoutText: { ...typography.bodyMedium, color: colors.danger },
  });
}
