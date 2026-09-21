import React, {useCallback, useState, useMemo} from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { ChurchMember, Profile } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, ColorTokens } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { formatDateBR, formatDayMonth } from '../utils/dates';

export function MemberDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const memberId = route.params?.memberId as string;
  const [member, setMember] = useState<(ChurchMember & { profile?: Profile }) | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('church_members')
      .select('*, profile:profiles(*)')
      .eq('id', memberId)
      .single();
    setMember(data as any);
    setLoading(false);
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading || !member) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const p = member.profile;
  const roleLabel =
    member.role === 'owner' ? 'Administrador' : member.role === 'leader' ? 'Líder' : 'Músico';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Membro" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Avatar uri={p?.avatar_url} name={p?.name} size={88} />
          <Text style={styles.name}>{p?.name ?? 'Integrante'}</Text>
          <Badge label={roleLabel} variant="primary" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Instrumento / função</Text>
          <Text style={styles.value}>{member.instrument || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Aniversário</Text>
          <Text style={styles.value}>
            {p?.birth_date ? formatDayMonth(p.birth_date) : 'Não informado'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {member.is_active === false ? 'Inativo' : 'Ativo'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.xl },
  back: { ...typography.body, color: colors.primary, marginBottom: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.xxl, gap: spacing.xs },
  name: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
})
}

