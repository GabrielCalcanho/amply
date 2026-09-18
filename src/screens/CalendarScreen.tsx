import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { formatDateBR, formatTime, toISODate, pad2 } from '../utils/dates';
import { EmptyState } from '../components/EmptyState';

type Mode = 'month' | 'list';

export function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership } = useAuth();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>('list');
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('setlists')
      .select('*')
      .eq('church_id', church.id)
      .order('date', { ascending: true });
    if (error) console.warn(error.message);
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Calendário" />
      <View style={styles.header}>
        <View style={styles.modeRow}>
          <TouchableOpacity onPress={() => setMode('list')}>
            <Text style={[styles.mode, mode === 'list' && styles.modeOn]}>Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('month')}>
            <Text style={[styles.mode, mode === 'month' && styles.modeOn]}>Mês</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'list' ? (
        <FlatList
          data={setlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Seu calendário está vazio"
              description="Crie sua primeira escala para começar."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate('SetlistDetail', { setlistId: item.id })}
            >
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>
                {formatDateBR(item.date)}
                {item.time ? ` · ${formatTime(item.time)}` : ''}
              </Text>
              <Text style={styles.itemStatus}>
                {SETLIST_STATUS_LABELS[(item.status as SetlistStatus) || 'scheduled']}
              </Text>
            </TouchableOpacity>
          )}
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
            >
              <Text style={styles.navBtn}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else setViewMonth((m) => m + 1);
              }}
            >
              <Text style={styles.navBtn}>›</Text>
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
                      setMode('list');
                    }
                  }}
                >
                  <Text style={styles.dayText}>{day}</Text>
                  {has ? <View style={styles.dot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          {canManage ? (
            <TouchableOpacity
              style={styles.cta}
              onPress={() => navigation.navigate('SetlistForm')}
            >
              <Text style={styles.ctaText}>+ Nova escala</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.h2, color: colors.text },
  modeRow: { flexDirection: 'row', gap: spacing.md },
  mode: { ...typography.body, color: colors.textMuted },
  modeOn: { color: colors.primary, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTitle: { ...typography.h3, color: colors.text },
  itemMeta: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  itemStatus: { ...typography.caption, color: colors.primary, marginTop: spacing.sm },
  monthWrap: { padding: spacing.lg },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: { fontSize: 28, color: colors.primary, paddingHorizontal: spacing.sm },
  monthTitle: { ...typography.bodyMedium, color: colors.text, textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHas: { backgroundColor: colors.primaryLight, borderRadius: radius.sm },
  dayText: { ...typography.body, color: colors.text },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  cta: { marginTop: spacing.lg, alignItems: 'center' },
  ctaText: { ...typography.bodyMedium, color: colors.primary },
})
}

