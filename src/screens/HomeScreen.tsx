import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { AppHeader } from '../components/layout/AppHeader';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Setlist, Profile, SETLIST_STATUS_LABELS, SetlistStatus } from '../types';
import { spacing, radius, shadow } from '../constants/theme';
import {
  formatDateLongBR,
  formatTime,
  todayISO,
  isBirthdayToday,
  nextBirthdayISO,
  formatDayMonth,
} from '../utils/dates';

type Bday = {
  id: string;
  name: string;
  avatar_url: string | null;
  birth_date: string;
  next: string;
  instrument?: string | null;
};

const SHORTCUTS = [
  { key: 'ministry', label: 'Ministérios', icon: 'business-outline' as const, route: 'Ministry' },
  { key: 'announcements', label: 'Avisos', icon: 'megaphone-outline' as const, route: 'Announcements' },
  { key: 'scales', label: 'Minhas escalas', icon: 'calendar-outline' as const, route: 'ScaleOverview' },
  { key: 'birthdays', label: 'Aniversariantes', icon: 'gift-outline' as const, route: 'Birthdays' },
];

export function HomeScreen() {
  const { profile, church, membership } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [nextSetlist, setNextSetlist] = useState<Setlist | null>(null);
  const [birthdays, setBirthdays] = useState<Bday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!church) return;
    try {
      const today = todayISO();

      const { data: setlists } = await supabase
        .from('setlists')
        .select('*, setlist_songs(count)')
        .eq('church_id', church.id)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(1);

      if (setlists && setlists.length > 0) {
        const s = setlists[0] as any;
        setNextSetlist({
          ...s,
          songs_count: s.setlist_songs?.[0]?.count ?? 0,
        });
      } else {
        setNextSetlist(null);
      }

      const { data: members } = await supabase
        .from('church_members')
        .select('user_id, instrument, profile:profiles(id, name, avatar_url, birth_date)')
        .eq('church_id', church.id);

      const list: Bday[] = [];
      for (const m of members ?? []) {
        const p = (m as any).profile as Profile | null;
        if (!p?.birth_date) continue;
        const next = nextBirthdayISO(p.birth_date);
        if (!next) continue;
        list.push({
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          birth_date: p.birth_date,
          next,
          instrument: (m as any).instrument,
        });
      }
      list.sort((a, b) => a.next.localeCompare(b.next));
      setBirthdays(list.slice(0, 8));
    } catch (e) {
      console.warn('Home load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const firstName = profile?.name?.split(' ')[0] ?? 'Músico';
  const todayBdays = birthdays.filter((b) => isBirthdayToday(b.birth_date));
  const upcomingBdays = birthdays.filter((b) => !isBirthdayToday(b.birth_date)).slice(0, 4);

  if (loading) {
    return (
      <TabScreenShell>
        <AppHeader brand showNotifications showAvatar />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </TabScreenShell>
    );
  }

  return (
    <TabScreenShell>
      <AppHeader brand showNotifications showAvatar />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.hello, { color: colors.text }]}>Olá, {firstName}!</Text>
          <Text style={[styles.subHello, { color: colors.textSecondary }]}>
            Que bom te ver por aqui!
          </Text>
        </View>

        {/* Ministry / Church card */}
        <Pressable
          onPress={() => navigation.navigate('Ministry')}
          style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
        >
          <View
            style={[
              styles.ministryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.xl,
                ...shadow.sm,
              },
            ]}
          >
            {church?.logo_url ? (
              <Image source={{ uri: church.logo_url }} style={styles.ministryLogo} />
            ) : (
              <View
                style={[
                  styles.ministryLogo,
                  styles.ministryLogoPh,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="business" size={22} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.ministryInfo}>
              <Text style={[styles.ministryChurch, { color: colors.text }]} numberOfLines={1}>
                {church?.name ?? 'Igreja'}
              </Text>
              <Text style={[styles.ministryLabel, { color: colors.textSecondary }]}>
                Ministério de Louvor
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Pressable>

        {/* Shortcuts */}
        <View style={styles.shortcuts}>
          {SHORTCUTS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => navigation.navigate(s.route)}
              style={({ pressed }) => [
                styles.shortcut,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  opacity: pressed ? 0.85 : 1,
                  ...shadow.sm,
                },
              ]}
            >
              <View
                style={[
                  styles.shortcutIcon,
                  { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md },
                ]}
              >
                <Ionicons name={s.icon} size={20} color={colors.text} />
              </View>
              <Text style={[styles.shortcutLabel, { color: colors.text }]} numberOfLines={2}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Next setlist highlight */}
        {nextSetlist ? (
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Próxima escala</Text>
            <Card
              inverse
              onPress={() =>
                navigation.navigate('SetlistDetail', { setlistId: nextSetlist.id })
              }
            >
              <Text style={[styles.cardTitle, { color: colors.textInverse }]}>
                {nextSetlist.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.textInverse, opacity: 0.75 }]}>
                {formatDateLongBR(nextSetlist.date)}
                {nextSetlist.time ? ` · ${formatTime(nextSetlist.time)}` : ''}
                {nextSetlist.location ? ` · ${nextSetlist.location}` : ''}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardStatus, { color: colors.textInverse, opacity: 0.65 }]}>
                  {SETLIST_STATUS_LABELS[(nextSetlist.status as SetlistStatus) || 'scheduled']}
                  {' · '}
                  {nextSetlist.songs_count ?? 0}{' '}
                  {(nextSetlist.songs_count ?? 0) === 1 ? 'música' : 'músicas'}
                </Text>
                <View
                  style={[
                    styles.detailBtn,
                    {
                      backgroundColor: colors.textInverse,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text style={[styles.detailBtnText, { color: colors.surfaceInverse }]}>
                    Ver detalhes
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {/* Birthdays */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
            Aniversariantes
          </Text>
          <Pressable onPress={() => navigation.navigate('Birthdays')} hitSlop={8}>
            <Text style={[styles.seeAll, { color: colors.textSecondary }]}>Ver todos</Text>
          </Pressable>
        </View>

        {todayBdays.length === 0 && upcomingBdays.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhum aniversário próximo cadastrado.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {[...todayBdays, ...upcomingBdays].slice(0, 5).map((b) => (
              <Pressable
                key={b.id}
                onPress={() => navigation.navigate('MemberDetail', { userId: b.id })}
                style={({ pressed }) => [
                  styles.bdayRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    opacity: pressed ? 0.9 : 1,
                    ...shadow.sm,
                  },
                ]}
              >
                <Avatar uri={b.avatar_url} name={b.name} size={44} />
                <View style={styles.bdayInfo}>
                  <Text style={[styles.bdayName, { color: colors.text }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text
                    style={[
                      styles.bdayMeta,
                      {
                        color: isBirthdayToday(b.birth_date)
                          ? colors.text
                          : colors.textSecondary,
                        fontWeight: isBirthdayToday(b.birth_date) ? '600' : '400',
                      },
                    ]}
                  >
                    {isBirthdayToday(b.birth_date) ? 'Hoje' : formatDayMonth(b.birth_date)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl + 16,
  },
  greeting: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  hello: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subHello: {
    fontSize: 15,
    marginTop: 4,
  },
  ministryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xl,
  },
  ministryLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  ministryLogoPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ministryInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  ministryChurch: {
    fontSize: 15,
    fontWeight: '600',
  },
  ministryLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.xl,
  },
  shortcut: {
    width: '47.5%',
    flexGrow: 1,
    flexBasis: '45%',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 88,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  cardStatus: {
    fontSize: 12,
    flex: 1,
  },
  detailBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  bdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bdayInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bdayName: {
    fontSize: 15,
    fontWeight: '600',
  },
  bdayMeta: {
    fontSize: 13,
    marginTop: 2,
  },
});
