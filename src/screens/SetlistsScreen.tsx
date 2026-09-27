import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { AppHeader } from '../components/layout/AppHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { EmptyState } from '../components/EmptyState';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus } from '../types';
import { spacing, radius, shadow, typography } from '../constants/theme';
import { formatDateLongBR, formatTime, todayISO } from '../utils/dates';
import { formatSupabaseError } from '../utils/payload';

type FilterKey = 'upcoming' | 'past' | 'all';

export function SetlistsScreen() {
  const { church, membership } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [filter, setFilter] = useState<FilterKey>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const today = todayISO();

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('setlists')
      .select('*, setlist_songs(count), setlist_members(count)')
      .eq('church_id', church.id)
      .order('date', { ascending: false });

    if (error) {
      setError(formatSupabaseError(error));
      setLoading(false);
      return;
    }
    const mapped = (data ?? []).map((s: any) => ({
      ...s,
      songs_count: s.setlist_songs?.[0]?.count ?? 0,
      members_count: s.setlist_members?.[0]?.count ?? 0,
    }));
    setSetlists(mapped);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    if (filter === 'upcoming') {
      return setlists
        .filter((s) => s.date >= today && s.status !== 'cancelled')
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    if (filter === 'past') {
      return setlists
        .filter((s) => s.date < today || s.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    return setlists;
  }, [setlists, filter, today]);

  const statusTone = (status: SetlistStatus) => {
    if (status === 'confirmed') return 'success' as const;
    if (status === 'cancelled') return 'danger' as const;
    if (status === 'completed') return 'neutral' as const;
    return 'info' as const;
  };

  if (loading) {
    return (
      <TabScreenShell>
        <AppHeader title="Setlists" showNotifications={false} showAvatar={false} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </TabScreenShell>
    );
  }

  if (error) {
    return (
      <TabScreenShell>
        <AppHeader title="Setlists" showNotifications={false} showAvatar={false} />
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={load}
        />
      </TabScreenShell>
    );
  }

  return (
    <TabScreenShell>
      <AppHeader
        title="Setlists"
        showNotifications={false}
        showAvatar={false}
        right={
          canManage ? (
            <Pressable
              onPress={() => navigation.navigate('SetlistForm')}
              hitSlop={10}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
            </Pressable>
          ) : null
        }
      />

      <View style={styles.toolbar}>
        <SegmentedControl
          options={[
            { key: 'upcoming', label: 'Próximos' },
            { key: 'past', label: 'Passadas' },
            { key: 'all', label: 'Todas' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={
              filter === 'upcoming'
                ? 'Nenhuma escala próxima'
                : filter === 'past'
                  ? 'Nenhuma escala passada'
                  : 'Nenhuma escala cadastrada'
            }
            description={
              canManage
                ? 'Crie sua primeira escala para começar a organizar o ministério.'
                : 'Aguarde o líder criar uma escala.'
            }
            actionLabel={canManage ? 'Criar escala' : undefined}
            onAction={canManage ? () => navigation.navigate('SetlistForm') : undefined}
          />
        }
        renderItem={({ item, index }) => {
          const highlight = filter === 'upcoming' && index === 0;
          const titleColor = highlight ? colors.textInverse : colors.text;
          const metaColor = highlight ? colors.textInverse : colors.textSecondary;
          const mutedColor = highlight ? colors.textInverse : colors.textMuted;
          return (
          <Pressable
            onPress={() => navigation.navigate('SetlistDetail', { setlistId: item.id })}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: highlight ? colors.surfaceInverse : colors.surface,
                borderColor: highlight ? 'transparent' : colors.border,
                borderRadius: radius.xl,
                opacity: pressed ? 0.92 : 1,
                ...(highlight ? {} : shadow.sm),
              },
            ]}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Badge
                label={SETLIST_STATUS_LABELS[(item.status as SetlistStatus) || 'scheduled']}
                tone={highlight ? 'onInverse' : statusTone((item.status as SetlistStatus) || 'scheduled')}
              />
            </View>
            <Text style={[styles.cardMeta, { color: metaColor, opacity: highlight ? 0.8 : 1 }]}>
              {formatDateLongBR(item.date)}
              {item.time ? ` · ${formatTime(item.time)}` : ''}
            </Text>
            {item.location ? (
              <Text style={[styles.cardLoc, { color: mutedColor, opacity: highlight ? 0.7 : 1 }]} numberOfLines={1}>
                {item.location}
              </Text>
            ) : null}
            <View style={styles.cardFooter}>
              <Text style={[styles.cardStats, { color: mutedColor, opacity: highlight ? 0.7 : 1 }]}>
                {item.members_count ?? 0} membros · {item.songs_count ?? 0} músicas
              </Text>
              <Ionicons name="chevron-forward" size={16} color={mutedColor} />
            </View>
          </Pressable>
          );
        }}
      />
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    ...typography.h3,
    flex: 1,
  },
  cardMeta: {
    ...typography.caption,
    marginTop: 6,
  },
  cardLoc: {
    ...typography.small,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardStats: {
    ...typography.small,
  },
});
