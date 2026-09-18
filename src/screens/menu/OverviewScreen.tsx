import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import {
  MemberStatus,
  MEMBER_STATUS_LABELS,
  Setlist,
  SetlistStatus,
  SETLIST_STATUS_LABELS,
} from '../../types';
import { spacing, typography, radius, shadow } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateBR, formatTime, todayISO, toISODate } from '../../utils/dates';
import { formatSupabaseError } from '../../utils/payload';

type Period = 'upcoming' | 'week' | 'month';

type ParticipationRow = {
  id: string;
  status: MemberStatus;
  instrument: string | null;
  user_id: string;
  setlist_id: string;
  setlist: {
    id: string;
    title: string;
    date: string;
    time: string | null;
    location: string | null;
    status: string | null;
    church_id: string;
  };
  profile?: { id: string; name: string } | null;
};

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(baseISO + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function endOfMonthISO(baseISO: string): string {
  const d = new Date(baseISO + 'T12:00:00');
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

function statusTone(
  status: MemberStatus,
  success: string,
  danger: string,
  warning: string
): string {
  if (status === 'confirmed') return success;
  if (status === 'declined') return danger;
  return warning;
}

export function OverviewScreen() {
  const { church, user, membership } = useAuth();
  const navigation = useNavigation<any>();
  const { colors: c } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('upcoming');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [participations, setParticipations] = useState<ParticipationRow[]>([]);
  const [myPending, setMyPending] = useState<ParticipationRow[]>([]);
  const [counts, setCounts] = useState({
    setlists: 0,
    pending: 0,
    confirmed: 0,
    declined: 0,
    members: 0,
  });

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const dateRange = useMemo(() => {
    const today = todayISO();
    if (period === 'week') return { from: today, to: addDaysISO(today, 7) };
    if (period === 'month') return { from: today, to: endOfMonthISO(today) };
    return { from: today, to: null as string | null };
  }, [period]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!church) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const today = todayISO();
        const { from: rangeFrom, to: rangeTo } = dateRange;

        let setlistsQuery = supabase
          .from('setlists')
          .select('*')
          .eq('church_id', church.id)
          .gte('date', rangeFrom)
          .order('date', { ascending: true })
          .limit(30);
        if (rangeTo) setlistsQuery = setlistsQuery.lte('date', rangeTo);

        const [setlistsRes, membersCountRes, partsRes, myPendingRes] = await Promise.all([
          setlistsQuery,
          supabase
            .from('church_members')
            .select('*', { count: 'exact', head: true })
            .eq('church_id', church.id),
          supabase
            .from('setlist_members')
            .select(
              'id, status, instrument, user_id, setlist_id, setlist:setlists!inner(id, title, date, time, location, status, church_id), profile:profiles(id, name)'
            )
            .eq('setlist.church_id', church.id)
            .gte('setlist.date', rangeFrom),
          user
            ? supabase
                .from('setlist_members')
                .select(
                  'id, status, instrument, user_id, setlist_id, setlist:setlists!inner(id, title, date, time, location, status, church_id)'
                )
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .eq('setlist.church_id', church.id)
                .gte('setlist.date', today)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (setlistsRes.error) setError(formatSupabaseError(setlistsRes.error));

        let parts = (partsRes.data as ParticipationRow[] | null) ?? [];
        if (rangeTo) {
          parts = parts.filter((row) => row.setlist?.date && row.setlist.date <= rangeTo);
        }

        setSetlists((setlistsRes.data as Setlist[]) ?? []);
        setParticipations(parts);
        setMyPending((myPendingRes.data as ParticipationRow[]) ?? []);
        setCounts({
          setlists: setlistsRes.data?.length ?? 0,
          pending: parts.filter((r) => r.status === 'pending').length,
          confirmed: parts.filter((r) => r.status === 'confirmed').length,
          declined: parts.filter((r) => r.status === 'declined').length,
          members: membersCountRes.count ?? 0,
        });
      } catch (e) {
        setError((e as Error).message || 'Falha ao carregar visão geral');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [church, user, dateRange]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredParticipations = useMemo(() => {
    if (statusFilter === 'all') return participations;
    return participations.filter((row) => row.status === statusFilter);
  }, [participations, statusFilter]);

  const updateMyStatus = async (row: ParticipationRow, status: MemberStatus) => {
    if (!user) return;
    setBusyId(row.id);
    const { error: err } = await supabase
      .from('setlist_members')
      .update({ status })
      .eq('id', row.id)
      .eq('user_id', user.id);
    setBusyId(null);
    if (err) {
      Alert.alert('Erro', formatSupabaseError(err));
      return;
    }
    await load(true);
  };

  const openSetlist = (setlistId: string) => {
    navigation.navigate('SetlistDetail', { setlistId });
  };

  const periodChips: { key: Period; label: string }[] = [
    { key: 'upcoming', label: 'Próximas' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mês' },
  ];

  const statusChips: { key: MemberStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'declined', label: 'Ausências' },
  ];

  const summaryRows: {
    key: string;
    label: string;
    value: number;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
  }[] = [
    {
      key: 'pending',
      label: 'Pendentes',
      value: counts.pending,
      color: c.warning,
      icon: 'time-outline',
      onPress: () => setStatusFilter('pending'),
    },
    {
      key: 'confirmed',
      label: 'Confirmadas',
      value: counts.confirmed,
      color: c.success,
      icon: 'checkmark-circle-outline',
      onPress: () => setStatusFilter('confirmed'),
    },
    {
      key: 'declined',
      label: 'Ausências',
      value: counts.declined,
      color: c.danger,
      icon: 'close-circle-outline',
      onPress: () => setStatusFilter('declined'),
    },
    {
      key: 'setlists',
      label: 'Escalas no período',
      value: counts.setlists,
      color: c.primary,
      icon: 'calendar-outline',
    },
  ];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
        <ScreenHeader title="Visão geral" />
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScreenHeader title="Visão geral" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {church ? (
          <Text style={[styles.context, { color: c.primary }]} numberOfLines={1}>
            {church.name}
          </Text>
        ) : null}

        <View style={styles.chipRow}>
          {periodChips.map((chip) => {
            const active = period === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.primary : c.surface,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
                onPress={() => setPeriod(chip.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: active ? c.white : c.textSecondary }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.dangerLight }]}>
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            <Button title="Tentar de novo" onPress={() => load()} variant="secondary" />
          </View>
        ) : null}

        <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {summaryRows.map((row, index) => (
            <TouchableOpacity
              key={row.key}
              style={[
                styles.summaryRow,
                index < summaryRows.length - 1
                  ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }
                  : null,
              ]}
              onPress={row.onPress}
              activeOpacity={row.onPress ? 0.7 : 1}
              disabled={!row.onPress}
            >
              <View style={[styles.summaryIcon, { backgroundColor: row.color + '22' }]}>
                <Ionicons name={row.icon} size={18} color={row.color} />
              </View>
              <Text style={[styles.summaryLabel, { color: c.text }]} numberOfLines={1}>
                {row.label}
              </Text>
              <Text style={[styles.summaryValue, { color: row.color }]}>{row.value}</Text>
              {row.onPress ? (
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              ) : (
                <View style={{ width: 16 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Minhas pendências</Text>
            <Text style={[styles.sectionCount, { color: c.textMuted }]}>{myPending.length}</Text>
          </View>
          {myPending.length === 0 ? (
            <View style={[styles.softEmpty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.softEmptyText, { color: c.textSecondary }]}>
                Nenhuma presença aguardando resposta.
              </Text>
            </View>
          ) : (
            myPending.map((row) => (
              <View
                key={row.id}
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                <TouchableOpacity onPress={() => openSetlist(row.setlist_id)} activeOpacity={0.85}>
                  <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>
                    {row.setlist?.title ?? 'Escala'}
                  </Text>
                  <Text style={[styles.cardMeta, { color: c.textSecondary }]} numberOfLines={2}>
                    {formatDateBR(row.setlist?.date)}
                    {row.setlist?.time ? ` · ${formatTime(row.setlist.time)}` : ''}
                    {row.instrument ? ` · ${row.instrument}` : ''}
                  </Text>
                  {row.setlist?.location ? (
                    <Text style={[styles.cardSub, { color: c.textMuted }]} numberOfLines={1}>
                      {row.setlist.location}
                    </Text>
                  ) : null}
                </TouchableOpacity>
                <View style={styles.actionRow}>
                  <Button
                    title="Confirmar"
                    onPress={() => updateMyStatus(row, 'confirmed')}
                    loading={busyId === row.id}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Não poderei"
                    variant="secondary"
                    onPress={() => updateMyStatus(row, 'declined')}
                    loading={busyId === row.id}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Escalas no período</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Setlists')}>
              <Text style={[styles.link, { color: c.primary }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {setlists.length === 0 ? (
            <EmptyState
              title="Nenhuma escala"
              description="Não há escalas neste período."
              actionLabel={canManage ? 'Criar escala' : undefined}
              onAction={canManage ? () => navigation.navigate('SetlistForm') : undefined}
            />
          ) : (
            setlists.map((item) => {
              const statusKey = (item.status as SetlistStatus) || 'scheduled';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => openSetlist(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardTitle, { color: c.text, flex: 1 }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: c.primary }]} numberOfLines={1}>
                        {SETLIST_STATUS_LABELS[statusKey] ?? statusKey}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardMeta, { color: c.textSecondary }]} numberOfLines={1}>
                    {formatDateBR(item.date)}
                    {item.time ? ` · ${formatTime(item.time)}` : ''}
                  </Text>
                  {item.location ? (
                    <Text style={[styles.cardSub, { color: c.textMuted }]} numberOfLines={1}>
                      {item.location}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Participações</Text>
          </View>
          <View style={styles.chipRow}>
            {statusChips.map((chip) => {
              const active = statusFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? c.primary : c.surface,
                      borderColor: active ? c.primary : c.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(chip.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: active ? c.white : c.textSecondary }]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredParticipations.length === 0 ? (
            <View style={[styles.softEmpty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.softEmptyText, { color: c.textSecondary }]}>
                Nenhuma participação neste filtro.
              </Text>
            </View>
          ) : (
            filteredParticipations.slice(0, 40).map((row) => {
              const tone = statusTone(row.status, c.success, c.danger, c.warning);
              return (
                <TouchableOpacity
                  key={row.id}
                  style={[styles.partRow, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => openSetlist(row.setlist_id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.partLeft}>
                    <Text style={[styles.partName, { color: c.text }]} numberOfLines={1}>
                      {row.profile?.name ?? (row.user_id === user?.id ? 'Você' : 'Membro')}
                    </Text>
                    <Text style={[styles.cardMeta, { color: c.textSecondary }]} numberOfLines={1}>
                      {row.setlist?.title}
                      {' · '}
                      {formatDateBR(row.setlist?.date)}
                      {row.instrument ? ` · ${row.instrument}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tone + '22' }]}>
                    <Text style={[styles.statusPillText, { color: tone }]} numberOfLines={1}>
                      {MEMBER_STATUS_LABELS[row.status]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <Text style={[styles.footerText, { color: c.textMuted }]}>
          Membros no ministério: {counts.members}
          {canManage ? ' · Você pode gerenciar escalas e equipe' : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  context: {
    ...typography.caption,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { ...typography.small, fontWeight: '600' },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    ...shadow.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 52,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
  },
  summaryValue: {
    ...typography.h3,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3 },
  sectionCount: { ...typography.caption, fontWeight: '600' },
  link: { ...typography.caption, fontWeight: '600' },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    ...shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { ...typography.bodyMedium },
  cardMeta: { ...typography.caption, marginTop: 2 },
  cardSub: { ...typography.small, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    maxWidth: 110,
  },
  badgeText: { ...typography.small, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1 },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: 6,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 56,
  },
  partLeft: { flex: 1, minWidth: 0 },
  partName: { ...typography.bodyMedium },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    maxWidth: 120,
  },
  statusPillText: { ...typography.small, fontWeight: '600' },
  softEmpty: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  softEmptyText: { ...typography.body, textAlign: 'center' },
  errorBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: { ...typography.body },
  footerText: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
