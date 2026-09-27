import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { SearchField } from '../../components/SearchField';
import { EmptyState } from '../../components/EmptyState';
import { spacing, radius, shadow, typography } from '../../constants/theme';
import { MINISTRY_DEFS } from '../../constants/ministries';
import { formatSupabaseError } from '../../utils/payload';

type MinistryItem = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
};

export function MinistryHomeScreen() {
  const navigation = useNavigation<any>();
  const { church, membership } = useAuth();
  const { colors } = useTheme();
  const [members, setMembers] = useState<{ instrument: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('church_members')
      .select('instrument')
      .eq('church_id', church.id);
    if (error) setError(formatSupabaseError(error));
    else setMembers((data as { instrument: string | null }[]) ?? []);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items: MinistryItem[] = useMemo(() => {
    const counts: Record<string, number> = {};
    MINISTRY_DEFS.forEach((d) => {
      counts[d.key] = 0;
    });

    for (const m of members) {
      let matched = false;
      for (const def of MINISTRY_DEFS) {
        if (def.key === 'outros') continue;
        if (def.match(m.instrument)) {
          counts[def.key] += 1;
          matched = true;
          break;
        }
      }
      if (!matched) counts.outros += 1;
    }

    // Always show core list; hide zero only for optional groups like guitarra if 0
    return MINISTRY_DEFS.filter((d) => {
      if (['louvor', 'vocal', 'violao', 'bateria', 'teclado', 'baixo', 'outros', 'banda'].includes(d.key)) {
        return true;
      }
      return (counts[d.key] ?? 0) > 0;
    }).map((d) => ({
      key: d.key,
      name: d.name,
      icon: d.icon,
      count: counts[d.key] ?? 0,
    }));
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const openMinistry = (item: MinistryItem) => {
    // Navigate to team filtered by instrument group when possible
    navigation.navigate('Team', { filterInstrument: item.key, title: item.name });
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Ministérios" showBack />
      <View style={styles.toolbar}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar ministério..."
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={load}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            canManage ? (
              <View style={styles.manageSection}>
                <Text style={[styles.manageTitle, { color: colors.textSecondary }]}>
                  Gerenciar estrutura
                </Text>
                <View style={styles.manageRow}>
                  {(
                    [
                      { route: 'Teams', label: 'Equipes', icon: 'people-outline' },
                      { route: 'Roles', label: 'Funções', icon: 'briefcase-outline' },
                      {
                        route: 'Classifications',
                        label: 'Classificações',
                        icon: 'pricetags-outline',
                      },
                    ] as const
                  ).map((m) => (
                    <Pressable
                      key={m.route}
                      onPress={() => navigation.navigate(m.route)}
                      style={({ pressed }) => [
                        styles.manageCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderRadius: radius.lg,
                          opacity: pressed ? 0.9 : 1,
                          ...shadow.sm,
                        },
                      ]}
                    >
                      <Ionicons name={m.icon} size={20} color={colors.primary} />
                      <Text style={[styles.manageLabel, { color: colors.text }]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title="Nenhum ministério encontrado"
              description="Ajuste a busca ou cadastre membros com instrumento no perfil."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openMinistry(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                  opacity: pressed ? 0.92 : 1,
                  ...shadow.sm,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.textInverse} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {item.count} {item.count === 1 ? 'membro' : 'membros'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  manageSection: {
    marginBottom: spacing.md,
  },
  manageTitle: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  manageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manageCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  manageLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  name: {
    ...typography.h3,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
});
