import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { spacing, radius, shadow } from '../../constants/theme';

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function AccountProfileScreen() {
  const { colors } = useTheme();
  const { profile, church, membership, user } = useAuth();

  const roleLabel =
    membership?.role === 'owner'
      ? 'Administrador'
      : membership?.role === 'leader'
        ? 'Líder'
        : 'Músico';

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Perfil da conta" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.xl,
              ...shadow.sm,
            },
          ]}
        >
          <Row label="Nome" value={profile?.name ?? '—'} colors={colors} />
          <Row label="Email" value={user?.email ?? '—'} colors={colors} />
          <Row label="Status da conta" value="Ativa" colors={colors} />
          <Row
            label="Membro desde"
            value={formatDate(membership?.created_at || profile?.created_at)}
            colors={colors}
          />
          <Row label="Igreja / organização" value={church?.name ?? '—'} colors={colors} />
          <Row label="Papel na equipe" value={roleLabel} colors={colors} />
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Instrumento</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {membership?.instrument || '—'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '500' },
});
