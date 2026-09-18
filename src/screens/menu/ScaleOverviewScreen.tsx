import React, {useCallback, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Setlist, SetlistStatus, SETLIST_STATUS_LABELS } from '../../types';
import { spacing, typography, radius, shadow, ColorTokens } from '../../constants/theme';
import { formatDateBR, formatTime, todayISO } from '../../utils/dates';
import { formatSupabaseError } from '../../utils/payload';

type SetlistWithCounts = Setlist & {
  pending_count: number;
  confirmed_count: number;
  declined_count: number;
  members_count: number;
};

export function ScaleOverviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership } = useAuth();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<SetlistWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(
    async (isRefresh = false) => {
      if (!church) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('setlists')
        .select('*, setlist_members(status)')
        .eq('church_id', church.id)
        .gte('date', todayISO())
        .order('date', { ascending: true })
        .limit(40);

      if (err) {
        setError(formatSupabaseError(err));
        setItems([]);
      } else {
        const mapped: SetlistWithCounts[] = (data ?? []).map((row: any) => {
          const members = (row.setlist_members ?? []) as { status: string }[];
          return {
            ...row,
            setlist_members: undefined,
            members_count: members.length,
            pending_count: members.filter((m) => m.status === 'pending').length,
            confirmed_count: members.filter((m) => m.status === 'confirmed').length,
            declined_count: members.filter((m) => m.status === 'declined').length,
          };
        });
        setItems(mapped);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [church]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Panorama de escala" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Panorama de escala" />
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhuma escala futura"
            description="Crie escalas para acompanhar confirmações e pendências."
            actionLabel={canManage ? 'Criar escala' : undefined}
            onAction={canManage ? () => navigation.navigate('SetlistForm') : undefined}
          />
        }
        renderItem={({ item }) => {
          const statusKey = (item.status as SetlistStatus) || 'scheduled';
          const missing = item.pending_count;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SetlistDetail', { setlistId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.top}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {SETLIST_STATUS_LABELS[statusKey] ?? statusKey}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {formatDateBR(item.date)}
                {item.time ? ` · ${formatTime(item.time)}` : ''}
              </Text>
              {item.location ? <Text style={styles.sub}>{item.location}</Text> : null}

              <View style={styles.statsRow}>
                <Text style={[styles.stat, { color: colors.success }]}>
                  {item.confirmed_count} conf.
                </Text>
                <Text style={[styles.stat, { color: colors.warning }]}>
                  {item.pending_count} pend.
                </Text>
                <Text style={[styles.stat, { color: colors.danger }]}>
                  {item.declined_count} aus.
                </Text>
                <Text style={[styles.stat, { color: colors.textMuted }]}>
                  {item.members_count} no total
                </Text>
              </View>

              {missing > 0 ? (
                <Text style={styles.need}>
                  {missing === 1
                    ? '1 presença ainda aguarda resposta'
                    : `${missing} presenças ainda aguardam resposta`}
                </Text>
              ) : item.members_count > 0 ? (
                <Text style={styles.ok}>Todas as presenças respondidas</Text>
              ) : (
                <Text style={styles.need}>Nenhum músico atribuído ainda</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, flexGrow: 1, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  sub: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.small, color: colors.primary, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  stat: { ...typography.small, fontWeight: '600' },
  need: { ...typography.caption, color: colors.warning, marginTop: spacing.sm, fontWeight: '500' },
  ok: { ...typography.caption, color: colors.success, marginTop: spacing.sm, fontWeight: '500' },
  errorBox: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
  },
  errorText: { ...typography.body, color: colors.danger },
})
}

