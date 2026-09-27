import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  SectionList,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { spacing, radius, shadow } from '../../constants/theme';
import { isBirthdayToday, nextBirthdayISO, formatDayMonth, todayISO } from '../../utils/dates';
import { Profile } from '../../types';

type Bday = {
  id: string;
  name: string;
  avatar_url: string | null;
  birth_date: string;
  next: string;
  instrument?: string | null;
};

type FilterKey = 'today' | 'upcoming' | 'all';

export function BirthdaysMenuScreen() {
  const { church } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [list, setList] = useState<Bday[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('upcoming');

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data } = await supabase
      .from('church_members')
      .select('instrument, profile:profiles(id, name, avatar_url, birth_date)')
      .eq('church_id', church.id);
    const items: Bday[] = [];
    for (const m of data ?? []) {
      const p = (m as any).profile as Profile | null;
      if (!p?.birth_date) continue;
      const next = nextBirthdayISO(p.birth_date);
      if (!next) continue;
      items.push({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        birth_date: p.birth_date,
        next,
        instrument: (m as any).instrument,
      });
    }
    items.sort((a, b) => a.next.localeCompare(b.next));
    setList(items);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    if (filter === 'today') return list.filter((b) => isBirthdayToday(b.birth_date));
    if (filter === 'upcoming') {
      const today = todayISO();
      return list.filter((b) => !isBirthdayToday(b.birth_date) && b.next >= today).slice(0, 30);
    }
    return list;
  }, [list, filter]);

  // Group by date for display
  const sections = useMemo(() => {
    const map = new Map<string, Bday[]>();
    for (const b of filtered) {
      const key = isBirthdayToday(b.birth_date) ? 'Hoje' : formatDayMonth(b.birth_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Aniversariantes" />
      <View style={styles.toolbar}>
        <SegmentedControl
          options={[
            { key: 'today', label: 'Hoje' },
            { key: 'upcoming', label: 'Próximos' },
            { key: 'all', label: 'Todos' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="gift-outline"
              title={
                filter === 'today'
                  ? 'Nenhum aniversário hoje'
                  : 'Nenhum aniversário cadastrado'
              }
              description="Membros podem informar a data de nascimento no perfil."
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('MemberDetail', { userId: item.id })}
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
              <Avatar uri={item.avatar_url} name={item.name} size={48} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {item.instrument || '—'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
});
