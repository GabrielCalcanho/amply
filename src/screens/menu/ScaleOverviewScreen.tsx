import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus, MemberStatus } from '../../types';
import { spacing, radius, shadow, typography } from '../../constants/theme';
import { formatTime, todayISO } from '../../utils/dates';
import { formatSupabaseError } from '../../utils/payload';

type MemberPreview = {
  id: string;
  user_id: string;
  status: MemberStatus;
  profile?: { name: string; avatar_url: string | null } | null;
};

type SetlistWithMeta = Setlist & {
  members?: MemberPreview[];
  songs_count?: number;
  confirmed?: number;
  pending?: number;
  declined?: number;
};

function formatDayLong(iso: string) {
  try {
    const d = new Date(iso + 'T12:00:00');
    const s = d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return iso;
  }
}

function shiftDate(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ScaleOverviewScreen() {
  const { church, membership } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [all, setAll] = useState<SetlistWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    setError(null);
    const today = todayISO();
    const { data, error } = await supabase
      .from('setlists')
      .select(
        '*, setlist_songs(count), setlist_members(id, user_id, status, profile:profiles(name, avatar_url))'
      )
      .eq('church_id', church.id)
      .gte('date', today)
      .neq('status', 'cancelled')
      .order('date', { ascending: true })
      .limit(40);

    if (error) {
      setError(formatSupabaseError(error));
      setLoading(false);
      return;
    }
    const mapped: SetlistWithMeta[] = (data ?? []).map((s: any) => {
      const members: MemberPreview[] = (s.setlist_members ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        status: m.status,
        profile: m.profile,
      }));
      return {
        ...s,
        songs_count: s.setlist_songs?.[0]?.count ?? 0,
        members,
        confirmed: members.filter((m) => m.status === 'confirmed').length,
        pending: members.filter((m) => m.status === 'pending').length,
        declined: members.filter((m) => m.status === 'declined').length,
      };
    });
    setAll(mapped);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const daySetlists = useMemo(
    () => all.filter((s) => s.date === selectedDate),
    [all, selectedDate]
  );

  const otherSetlists = useMemo(
    () => all.filter((s) => s.date !== selectedDate).slice(0, 8),
    [all, selectedDate]
  );

  const statusTone = (status: SetlistStatus) => {
    if (status === 'confirmed') return 'success' as const;
    if (status === 'cancelled') return 'danger' as const;
    return 'info' as const;
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Minhas escalas" />

      {/* Date selector */}
      <View style={styles.dateBar}>
        <Pressable
          onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
          hitSlop={10}
          accessibilityLabel="Dia anterior"
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDayLong(selectedDate)}
          </Text>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        </View>
        <Pressable
          onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
          hitSlop={10}
          accessibilityLabel="Próximo dia"
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {daySetlists.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Nenhuma escala neste dia"
              description="Use as setas para ver outros dias ou crie uma nova escala."
            />
          ) : (
            daySetlists.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  navigation.navigate('SetlistDetail', { setlistId: item.id })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.xl,
                    opacity: pressed ? 0.94 : 1,
                    ...shadow.sm,
                  },
                ]}
              >
                {/* Data em destaque */}
                <Text style={[styles.cardDay, { color: colors.textMuted }]}>
                  {formatDayLong(item.date).toUpperCase()}
                </Text>

                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.cardTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {item.time ? (
                      <Text style={[styles.cardTime, { color: colors.text }]}>
                        {formatTime(item.time)}
                      </Text>
                    ) : (
                      <Text style={[styles.cardTime, { color: colors.textMuted }]}>
                        Horário a definir
                      </Text>
                    )}
                    {item.location ? (
                      <Text
                        style={[styles.cardLoc, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={
                      SETLIST_STATUS_LABELS[(item.status as SetlistStatus) || 'scheduled']
                    }
                    tone={statusTone((item.status as SetlistStatus) || 'scheduled')}
                  />
                </View>

                {/* Avatares da equipe */}
                {(item.members?.length ?? 0) > 0 ? (
                  <View style={styles.avatars}>
                    {item.members!.slice(0, 5).map((m) => (
                      <View key={m.id} style={styles.avatarWrap}>
                        <Avatar
                          uri={m.profile?.avatar_url}
                          name={m.profile?.name}
                          size={28}
                        />
                      </View>
                    ))}
                    {(item.members?.length ?? 0) > 5 ? (
                      <View
                        style={[
                          styles.moreAvatar,
                          { backgroundColor: colors.surfaceSecondary },
                        ]}
                      >
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 11,
                            fontWeight: '600',
                          }}
                        >
                          +{(item.members?.length ?? 0) - 5}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={[styles.avatarHint, { color: colors.textMuted }]}
                    >
                      {item.members!.length}{' '}
                      {item.members!.length === 1 ? 'integrante' : 'integrantes'}
                      {' · '}
                      {item.songs_count ?? 0}{' '}
                      {(item.songs_count ?? 0) === 1 ? 'música' : 'músicas'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.avatarHint, { color: colors.textMuted, marginTop: 12 }]}>
                    {item.songs_count ?? 0}{' '}
                    {(item.songs_count ?? 0) === 1 ? 'música' : 'músicas'}
                    {' · '}
                    Sem equipe definida
                  </Text>
                )}
              </Pressable>
            ))
          )}

          {otherSetlists.length > 0 ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Outras escalas
              </Text>
              {otherSetlists.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('SetlistDetail', { setlistId: item.id })
                  }
                  style={({ pressed }) => [
                    styles.otherCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                      opacity: pressed ? 0.92 : 1,
                      ...shadow.sm,
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.otherTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.otherMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {formatDayLong(item.date)}
                      {item.time ? ` · ${formatTime(item.time)}` : ''}
                    </Text>
                    {item.location ? (
                      <Text style={[styles.otherLoc, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={
                      SETLIST_STATUS_LABELS[(item.status as SetlistStatus) || 'scheduled']
                    }
                    tone={statusTone((item.status as SetlistStatus) || 'scheduled')}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    ...typography.cardTitle,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  cardDay: {
    ...typography.tiny,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    ...typography.h2,
  },
  cardTime: {
    ...typography.number,
    marginTop: 6,
  },
  cardLoc: {
    ...typography.caption,
    marginTop: 4,
  },
  avatars: {
    flexDirection: 'row',
    marginTop: 14,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  avatarWrap: {
    marginRight: -8,
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  avatarHint: {
    ...typography.small,
    marginLeft: 12,
  },
  sectionTitle: {
    ...typography.section,
    marginBottom: spacing.sm,
  },
  otherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    gap: 12,
  },
  otherTitle: {
    ...typography.cardTitle,
  },
  otherMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  otherLoc: {
    ...typography.caption,
    marginTop: 2,
  },
});
