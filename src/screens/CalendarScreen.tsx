import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { Badge } from '../components/Badge';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { formatDateBR, formatTime, pad2 } from '../utils/dates';
import { formatSupabaseError } from '../utils/payload';
import { EmptyState } from '../components/EmptyState';

type Mode = 'month' | 'list';

function statusTone(status: SetlistStatus): string {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'completed':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership } = useAuth();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>('list');
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('setlists')
      .select('*')
      .eq('church_id', church.id)
      .order('date', { ascending: true });
    if (loadError) setError(formatSupabaseError(loadError));
    setSetlists((data as Setlist[]) ?? []);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Setlist[]>();
    for (const s of setlists) {
      const key = s.date?.slice(0, 10);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [setlists]);

  const listData = useMemo(
    () => (dayFilter ? setlists.filter((s) => s.date?.slice(0, 10) === dayFilter) : setlists),
    [setlists, dayFilter]
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Calendário" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Calendário" />
        <View style={styles.center}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar"
            description={error}
            actionLabel="Tentar novamente"
            onAction={load}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Calendário" />
      <View style={styles.header}>
        <SegmentedControl<Mode>
          options={[
            { key: 'list', label: 'Lista' },
            { key: 'month', label: 'Mês' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === 'month') setDayFilter(null);
          }}
        />
      </View>

      {mode === 'list' ? (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            dayFilter ? (
              <Pressable
                style={styles.filterBar}
                onPress={() => setDayFilter(null)}
                accessibilityRole="button"
                accessibilityLabel="Limpar filtro de dia"
              >
                <Ionicons name="funnel-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.filterText}>{formatDateBR(dayFilter)}</Text>
                <Text style={styles.filterClear}>Limpar</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={dayFilter ? 'Nenhuma escala neste dia' : 'Seu calendário está vazio'}
              description={
                dayFilter ? undefined : 'Crie sua primeira escala para começar.'
              }
            />
          }
          renderItem={({ item }) => {
            const statusKey = (item.status as SetlistStatus) || 'scheduled';
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => navigation.navigate('SetlistDetail', { setlistId: item.id })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${formatDateBR(item.date)}`}
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Badge label={SETLIST_STATUS_LABELS[statusKey] ?? statusKey} tone={statusTone(statusKey)} />
                </View>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {formatDateBR(item.date)}
                  {item.time ? ` · ${formatTime(item.time)}` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.monthWrap}>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else setViewMonth((m) => m - 1);
              }}
              hitSlop={12}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else setViewMonth((m) => m + 1);
              }}
              hitSlop={12}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => (
              <Text key={i} style={styles.weekDay}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day == null) return <View key={`e-${i}`} style={styles.dayCell} />;
              const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
              const events = byDate.get(iso) ?? [];
              const has = events.length > 0;
              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.dayCell, has && styles.dayHas]}
                  onPress={() => {
                    if (events.length === 1) {
                      navigation.navigate('SetlistDetail', { setlistId: events[0].id });
                    } else if (events.length > 1) {
                      setDayFilter(iso);
                      setMode('list');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${day}${has ? `, ${events.length} escala(s)` : ''}`}
                >
                  <Text style={styles.dayText}>{day}</Text>
                  {has ? <View style={styles.dot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          {canManage ? (
            <Pressable
              style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => navigation.navigate('SetlistForm')}
              accessibilityRole="button"
              accessibilityLabel="Nova escala"
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.ctaText}>Nova escala</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
    marginBottom: spacing.sm,
  },
  filterText: { ...typography.caption, color: colors.text },
  filterClear: { ...typography.caption, color: colors.primary, fontWeight: '600', marginLeft: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemTitle: { ...typography.cardTitle, color: colors.text, flex: 1 },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  monthWrap: { padding: spacing.lg },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: { ...typography.bodyMedium, color: colors.text, textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHas: { backgroundColor: colors.primaryMuted, borderRadius: radius.sm },
  dayText: { ...typography.body, color: colors.text },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  cta: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  ctaText: { ...typography.bodyMedium, color: colors.primary },
})
}
