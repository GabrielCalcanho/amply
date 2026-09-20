import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus } from '../types';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import {
  formatDateLongBR,
  formatTime,
  todayISO,
  isBirthdayToday,
  nextBirthdayISO,
  formatDayMonth,
} from '../utils/dates';
import { formatSupabaseError } from '../utils/payload';

type Bday = {
  id: string;
  name: string;
  avatar_url: string | null;
  birth_date: string;
  next: string;
};

function greetingForHour(h: number): string {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function HomeScreen() {
  const { profile, church, membership, user, refreshMembership } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [nextSetlist, setNextSetlist] = useState<Setlist | null>(null);
  const [weekSetlists, setWeekSetlists] = useState<Setlist[]>([]);
  const [myPresence, setMyPresence] = useState<
    'pending' | 'confirmed' | 'declined' | null
  >(null);
  const [songsCount, setSongsCount] = useState(0);
  const [membersCount, setMembersCount] = useState(0);
  const [pendingConfirm, setPendingConfirm] = useState(0);
  const [birthdays, setBirthdays] = useState<Bday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const firstName = (profile?.name || 'Músico').split(' ')[0];
  const greet = greetingForHour(new Date().getHours());

  const loadData = useCallback(async () => {
    if (!church) return;
    try {
      const today = todayISO();
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndISO = weekEnd.toISOString().slice(0, 10);

      const { data: upcoming } = await supabase
        .from('setlists')
        .select('*, setlist_songs(count)')
        .eq('church_id', church.id)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(5);

      const mapped = (upcoming ?? []).map((s: any) => ({
        ...s,
        songs_count: s.setlist_songs?.[0]?.count ?? 0,
      })) as Setlist[];

      const next = mapped[0] ?? null;
      setNextSetlist(next);
      setWeekSetlists(
        mapped.filter((s) => s.date <= weekEndISO).slice(0, 4)
      );

      if (user?.id && next?.id) {
        const { data: presence } = await supabase
          .from('setlist_members')
          .select('status')
          .eq('setlist_id', next.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setMyPresence((presence?.status as any) ?? null);
      } else {
        setMyPresence(null);
      }

      const [{ count: sc }, { count: mc }] = await Promise.all([
        supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('church_id', church.id),
        supabase
          .from('church_members')
          .select('*', { count: 'exact', head: true })
          .eq('church_id', church.id),
      ]);
      setSongsCount(sc ?? 0);
      setMembersCount(mc ?? 0);

      if (user?.id) {
        const { count: pc } = await supabase
          .from('setlist_members')
          .select('*, setlist:setlists!inner(church_id, date, status)', {
            count: 'exact',
            head: true,
          })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .eq('setlist.church_id', church.id)
          .gte('setlist.date', today)
          .neq('setlist.status', 'cancelled');
        setPendingConfirm(pc ?? 0);
      }

      const { data: members } = await supabase
        .from('church_members')
        .select('user_id, profile:profiles(id, name, avatar_url, birth_date)')
        .eq('church_id', church.id);

      const bdays: Bday[] = [];
      (members ?? []).forEach((m: any) => {
        const p = m.profile;
        if (p?.birth_date) {
          bdays.push({
            id: p.id,
            name: p.name,
            avatar_url: p.avatar_url,
            birth_date: p.birth_date,
            next: nextBirthdayISO(p.birth_date) ?? p.birth_date,
          });
        }
      });
      bdays.sort((a, b) => a.next.localeCompare(b.next));
      setBirthdays(bdays.slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [church, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const roleLabel =
    membership?.role === 'owner'
      ? 'Administrador'
      : membership?.role === 'leader'
      ? 'Líder'
      : 'Músico';

  const pickChurchLogo = async () => {
    if (!church?.id || !canManage) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permissão',
        'Permita acesso à galeria para definir a imagem do ministério.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setLogoUploading(true);
    try {
      const rawExt =
        asset.uri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
      const ext = rawExt === 'png' || rawExt === 'webp' ? rawExt : 'jpg';
      const contentType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
      const path = `churches/${church.id}/logo.${ext}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        Alert.alert('Erro', 'Não foi possível ler a imagem.');
        return;
      }

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType });

      if (upErr) {
        Alert.alert(
          'Erro no upload',
          formatSupabaseError(upErr) +
            '\n\nConfirme o bucket "avatars" e policies que permitam upload em churches/.'
        );
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('churches')
        .update({ logo_url: url })
        .eq('id', church.id);

      if (dbErr) {
        Alert.alert('Erro', formatSupabaseError(dbErr));
        return;
      }

      await refreshMembership();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message || 'Falha ao enviar a imagem.');
    } finally {
      setLogoUploading(false);
    }
  };

  const statusKey = (nextSetlist?.status as SetlistStatus) || 'scheduled';

  return (
    <TabScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Saudação */}
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{greet},</Text>
              <Text style={styles.greetingName}>{firstName}</Text>
              <Text style={styles.greetingMeta}>
                {roleLabel}
                {membership?.instrument ? ` · ${membership.instrument}` : ''}
              </Text>
            </View>

            {/* Ministério compacto */}
            <TouchableOpacity
              style={styles.ministryRow}
              onPress={() => navigation.navigate('Overview')}
              activeOpacity={0.85}
            >
              <TouchableOpacity
                onPress={canManage ? pickChurchLogo : undefined}
                activeOpacity={0.85}
                disabled={logoUploading || !canManage}
              >
                {logoUploading ? (
                  <View style={[styles.ministryLogo, styles.ministryLogoPh]}>
                    <ActivityIndicator color={colors.primary} size="small" />
                  </View>
                ) : church?.logo_url ? (
                  <Image
                    source={{ uri: church.logo_url }}
                    style={styles.ministryLogo}
                  />
                ) : (
                  <View style={[styles.ministryLogo, styles.ministryLogoPh]}>
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.ministryInfo}>
                <Text style={styles.ministryLabel}>Ministério</Text>
                <Text style={styles.ministryName} numberOfLines={1}>
                  {church?.name ?? 'Ministério'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Alerta pendências */}
            {pendingConfirm > 0 ? (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={() => navigation.navigate('Setlists')}
                activeOpacity={0.85}
              >
                <View style={styles.alertIcon}>
                  <Ionicons name="alert-circle" size={20} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {pendingConfirm === 1
                      ? '1 confirmação pendente'
                      : `${pendingConfirm} confirmações pendentes`}
                  </Text>
                  <Text style={styles.alertDesc}>
                    Confirme sua participação nas setlists
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            ) : null}

            {/* Próximo compromisso */}
            <Text style={styles.sectionTitle}>Próximo compromisso</Text>
            {nextSetlist ? (
              <TouchableOpacity
                style={styles.nextCard}
                onPress={() =>
                  navigation.navigate('SetlistDetail', {
                    setlistId: nextSetlist.id,
                  })
                }
                activeOpacity={0.9}
              >
                <View style={styles.nextTop}>
                  <Text style={styles.nextEyebrow}>Setlist</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {SETLIST_STATUS_LABELS[statusKey] ?? statusKey}
                    </Text>
                  </View>
                </View>
                <Text style={styles.nextTitle} numberOfLines={2}>
                  {nextSetlist.title}
                </Text>
                <Text style={styles.nextMeta}>
                  {formatDateLongBR(nextSetlist.date)}
                  {nextSetlist.time ? ` · ${formatTime(nextSetlist.time)}` : ''}
                </Text>
                {nextSetlist.location ? (
                  <Text style={styles.nextLoc} numberOfLines={1}>
                    {nextSetlist.location}
                  </Text>
                ) : null}
                <View style={styles.nextFooter}>
                  <Text style={styles.nextStat}>
                    {nextSetlist.songs_count ?? 0}{' '}
                    {(nextSetlist.songs_count ?? 0) === 1
                      ? 'música'
                      : 'músicas'}
                  </Text>
                  {myPresence ? (
                    <Text
                      style={[
                        styles.presence,
                        myPresence === 'confirmed' && {
                          color: colors.success,
                        },
                        myPresence === 'declined' && {
                          color: colors.danger,
                        },
                        myPresence === 'pending' && {
                          color: colors.warning,
                        },
                      ]}
                    >
                      {myPresence === 'confirmed'
                        ? 'Confirmado'
                        : myPresence === 'declined'
                        ? 'Recusado'
                        : 'Pendente'}
                    </Text>
                  ) : null}
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhum compromisso próximo</Text>
                <Text style={styles.emptyDesc}>
                  Quando houver uma setlist agendada, ela aparece aqui.
                </Text>
              </View>
            )}

            {/* Agenda da semana */}
            {weekSetlists.length > 1 ? (
              <>
                <Text style={styles.sectionTitle}>Esta semana</Text>
                <View style={styles.listCard}>
                  {weekSetlists.slice(1).map((s, i, arr) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.listRow,
                        i < arr.length - 1 && styles.listRowBorder,
                      ]}
                      onPress={() =>
                        navigation.navigate('SetlistDetail', {
                          setlistId: s.id,
                        })
                      }
                      activeOpacity={0.75}
                    >
                      <View style={styles.listDate}>
                        <Text style={styles.listDay}>
                          {formatDayMonth(s.date)}
                        </Text>
                        {s.time ? (
                          <Text style={styles.listTime}>
                            {formatTime(s.time)}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {s.title}
                        </Text>
                        <Text style={styles.listMeta}>
                          {s.songs_count ?? 0} músicas
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {/* Atalhos rápidos */}
            <Text style={styles.sectionTitle}>Biblioteca</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate('Songs')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.quickValue}>{songsCount}</Text>
                <Text style={styles.quickLabel}>Músicas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate('Team')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.quickValue}>{membersCount}</Text>
                <Text style={styles.quickLabel}>Equipe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate('Setlists')}
                activeOpacity={0.8}
              >
                <Ionicons name="list-outline" size={22} color={colors.primary} />
                <Text style={styles.quickValue}>
                  {weekSetlists.length || '—'}
                </Text>
                <Text style={styles.quickLabel}>Setlists</Text>
              </TouchableOpacity>
            </View>

            {/* Aniversários */}
            {birthdays.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Aniversários</Text>
                <View style={styles.listCard}>
                  {birthdays.map((b, i) => (
                    <View
                      key={b.id}
                      style={[
                        styles.bdayRow,
                        i < birthdays.length - 1 && styles.listRowBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.bdayDot,
                          isBirthdayToday(b.birth_date) && {
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                      <Text style={styles.bdayName} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text style={styles.bdayDate}>
                        {isBirthdayToday(b.birth_date)
                          ? 'Hoje'
                          : formatDayMonth(b.next)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </TabScreenShell>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxxl,
    },

    greetingBlock: {
      marginBottom: spacing.xxl,
      paddingTop: spacing.sm,
    },
    greeting: {
      ...typography.caption,
      color: colors.textMuted,
    },
    greetingName: {
      ...typography.h1,
      color: colors.text,
      marginTop: 2,
    },
    greetingMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },

    ministryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    ministryLogo: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
    },
    ministryLogoPh: {
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ministryInfo: { flex: 1, minWidth: 0 },
    ministryLabel: {
      ...typography.small,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    ministryName: {
      ...typography.bodyMedium,
      color: colors.text,
      marginTop: 2,
    },

    alertCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.warningLight,
      marginBottom: spacing.lg,
    },
    alertIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertTitle: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    alertDesc: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },

    sectionTitle: {
      ...typography.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },

    nextCard: {
      backgroundColor: colors.black,
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginBottom: spacing.sm,
    },
    nextTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nextEyebrow: {
      ...typography.small,
      color: '#AAAAAA',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
    },
    statusPillText: {
      ...typography.small,
      color: colors.primaryDark,
      fontWeight: '600',
    },
    nextTitle: {
      ...typography.h3,
      color: colors.white,
      marginTop: spacing.sm,
    },
    nextMeta: {
      ...typography.body,
      color: '#D0D0D0',
      marginTop: 6,
    },
    nextLoc: {
      ...typography.caption,
      color: '#AAAAAA',
      marginTop: 4,
    },
    nextFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#333333',
    },
    nextStat: {
      ...typography.caption,
      color: '#D0D0D0',
      flex: 1,
    },
    presence: {
      ...typography.caption,
      fontWeight: '600',
    },

    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    emptyTitle: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    emptyDesc: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },

    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
    },
    listRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    listDate: {
      width: 52,
    },
    listDay: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '600',
    },
    listTime: {
      ...typography.small,
      color: colors.textMuted,
      marginTop: 2,
    },
    listTitle: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    listMeta: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },

    quickRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    quickCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    quickValue: {
      ...typography.h3,
      color: colors.text,
    },
    quickLabel: {
      ...typography.small,
      color: colors.textMuted,
    },

    bdayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    bdayDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.borderStrong,
    },
    bdayName: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    bdayDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
