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
import { spacing, radius, shadow } from '../../constants/theme';

type MinistryItem = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
};

/** Default ministry groups mapped from instruments / roles */
const MINISTRY_DEFS: {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  match: (instrument: string | null | undefined) => boolean;
}[] = [
  {
    key: 'louvor',
    name: 'Louvor',
    icon: 'musical-notes',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return !v || v.includes('louvor') || v.includes('líder') || v.includes('lider') || v.includes('regência') || v.includes('regencia');
    },
  },
  {
    key: 'banda',
    name: 'Banda',
    icon: 'people',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('banda') || v.includes('banda');
    },
  },
  {
    key: 'vocal',
    name: 'Vocal',
    icon: 'mic',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('vocal') || v.includes('voz') || v.includes('canto');
    },
  },
  {
    key: 'violao',
    name: 'Violão',
    icon: 'musical-note',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('violão') || v.includes('violao') || v.includes('guitarra acústica');
    },
  },
  {
    key: 'bateria',
    name: 'Bateria',
    icon: 'radio',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('bateria') || v.includes('cajón') || v.includes('cajon') || v.includes('percuss');
    },
  },
  {
    key: 'teclado',
    name: 'Teclado',
    icon: 'grid',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('teclado') || v.includes('piano') || v.includes('keys');
    },
  },
  {
    key: 'baixo',
    name: 'Baixo',
    icon: 'pulse',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('baixo') || v.includes('bass');
    },
  },
  {
    key: 'guitarra',
    name: 'Guitarra',
    icon: 'flash',
    match: (i) => {
      const v = (i ?? '').toLowerCase();
      return v.includes('guitarra') && !v.includes('acústica') && !v.includes('acustica');
    },
  },
  {
    key: 'outros',
    name: 'Outros',
    icon: 'ellipsis-horizontal',
    match: () => false, // filled as remainder
  },
];

export function MinistryHomeScreen() {
  const navigation = useNavigation<any>();
  const { church } = useAuth();
  const { colors } = useTheme();
  const [members, setMembers] = useState<{ instrument: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!church) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('church_members')
      .select('instrument')
      .eq('church_id', church.id);
    setMembers((data as { instrument: string | null }[]) ?? []);
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
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
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
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
});
