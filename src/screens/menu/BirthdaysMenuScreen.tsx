import React, {useCallback, useState, useMemo} from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { spacing, typography, ColorTokens } from '../../constants/theme';
import { isBirthdayToday, nextBirthdayISO, formatDayMonth } from '../../utils/dates';
import { Profile } from '../../types';

type Bday = { id: string; name: string; avatar_url: string | null; birth_date: string; next: string };

export function BirthdaysMenuScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church } = useAuth();
  const [list, setList] = useState<Bday[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data } = await supabase
      .from('church_members')
      .select('profile:profiles(id, name, avatar_url, birth_date)')
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Aniversariantes" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Nenhum aniversário cadastrado"
              description="Membros podem informar a data de nascimento no perfil."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar uri={item.avatar_url} name={item.name} size={44} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {formatDayMonth(item.birth_date)}
                  {isBirthdayToday(item.birth_date) ? ' · Hoje' : ''}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: { marginLeft: spacing.md, flex: 1 },
  name: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
})
}

