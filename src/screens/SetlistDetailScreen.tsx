import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabase';
import {
  Setlist,
  SetlistSong,
  SetlistMember,
  Song,
  MemberStatus,
  SETLIST_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  SetlistStatus,
} from '../types';
import { spacing, typography, radius } from '../constants/theme';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { notifyUsers } from '../utils/notifications';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { IconButton } from '../components/IconButton';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ActionMenu, ActionMenuItem } from '../components/ActionMenu';
import { formatSupabaseError } from '../utils/payload';
import { formatDateBR, formatTime } from '../utils/dates';

type SongRow = SetlistSong & { song: Song };
type AvailableMember = {
  user_id: string;
  instrument: string | null;
  profile?: { name?: string | null } | null;
};

export function SetlistDetailScreen() {
  const { membership, church, user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const route = useRoute<any>();
  const setlistId = route.params?.setlistId as string;

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [members, setMembers] = useState<SetlistMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [available, setAvailable] = useState<AvailableMember[]>([]);
  const [busy, setBusy] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const myMember = members.find((m) => m.user_id === user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: s, error: e1 }, { data: ss }, { data: sm }] =
      await Promise.all([
        supabase.from('setlists').select('*').eq('id', setlistId).single(),
        supabase
          .from('setlist_songs')
          .select('*, song:songs(*)')
          .eq('setlist_id', setlistId)
          .order('position'),
        supabase
          .from('setlist_members')
          .select('*, profile:profiles(*)')
          .eq('setlist_id', setlistId),
      ]);
    if (e1) setError(formatSupabaseError(e1));
    setSetlist(s as Setlist | null);
    setSongs((ss as SongRow[]) ?? []);
    setMembers((sm as SetlistMember[]) ?? []);
    setLoading(false);
  }, [setlistId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openPicker = () => {
    navigation.navigate('SongPicker', {
      setlistId,
      excludeIds: songs.map((s) => s.song_id),
    });
  };

  const openSetlistChat = async () => {
    const { data, error } = await supabase.rpc('get_or_create_setlist_conversation', {
      p_setlist_id: setlistId,
    });
    if (error || !data) {
      Alert.alert('Erro', error ? formatSupabaseError(error) : 'Não foi possível abrir o chat da escala.');
      return;
    }
    navigation.navigate('Chat', {
      conversationId: data as string,
      title: setlist?.title ? `Escala · ${setlist.title}` : 'Chat da escala',
    });
  };

  const removeSong = (row: SongRow) => {
    Alert.alert(
      'Remover da escala',
      `Remover "${row.song?.title}" desta escala?\n\nA música permanece no repertório.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await supabase.from('setlist_songs').delete().eq('id', row.id);
            setBusy(false);
            if (error) Alert.alert('Erro', formatSupabaseError(error));
            else {
              setSongs((prev) => prev.filter((s) => s.id !== row.id));
              await load();
            }
          },
        },
      ]
    );
  };

  const moveSong = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= songs.length) return;
    const updated = [...songs];
    const tmp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = tmp;
    setSongs(updated.map((s, i) => ({ ...s, position: i })));
    setBusy(true);
    await Promise.all(
      updated.map((s, i) =>
        supabase.from('setlist_songs').update({ position: i }).eq('id', s.id)
      )
    );
    setBusy(false);
  };

  const openMemberPicker = async () => {
    if (!church) return;
    const { data: team } = await supabase
      .from('church_members')
      .select('user_id, instrument, profile:profiles(name)')
      .eq('church_id', church.id);

    const existing = new Set(members.map((m) => m.user_id));
    const list = ((team ?? []) as AvailableMember[]).filter((m) => !existing.has(m.user_id));

    if (list.length === 0) {
      Alert.alert('Aviso', 'Todos os membros já estão nesta escala.');
      return;
    }
    setAvailable(list);
    setPickerOpen(true);
  };

  const addMember = async (m: AvailableMember) => {
    setBusy(true);
    const { error } = await supabase.from('setlist_members').insert({
      setlist_id: setlistId,
      user_id: m.user_id,
      instrument: m.instrument,
      status: 'pending',
    });
    setBusy(false);
    if (error) {
      Alert.alert('Erro', formatSupabaseError(error));
      return;
    }
    if (church && setlist) {
      await notifyUsers({
        churchId: church.id,
        userIds: [m.user_id],
        type: 'presence_pending',
        title: 'Confirme sua presença',
        body: `Você foi escalado em "${setlist.title}".`,
        data: { setlist_id: setlistId },
      });
    }
    load();
  };

  const removeMember = (m: SetlistMember) => {
    Alert.alert('Remover músico', `Remover ${m.profile?.name ?? 'músico'} da escala?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.from('setlist_members').delete().eq('id', m.id);
          setBusy(false);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else {
            setMembers((prev) => prev.filter((x) => x.id !== m.id));
            await load();
          }
        },
      },
    ]);
  };

  const updateMyStatus = async (status: MemberStatus) => {
    if (!myMember) return;
    setBusy(true);
    const { error } = await supabase
      .from('setlist_members')
      .update({ status })
      .eq('id', myMember.id)
      .eq('user_id', user!.id);
    setBusy(false);
    if (error) Alert.alert('Erro', formatSupabaseError(error));
    else {
      setMembers((prev) => prev.map((m) => (m.id === myMember.id ? { ...m, status } : m)));
      toast.success(MEMBER_STATUS_LABELS[status]);
    }
  };

  const duplicateSetlist = () => {
    Alert.alert('Duplicar escala', 'Criar uma cópia desta escala?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Duplicar',
        onPress: async () => {
          if (!setlist || !church || !user) return;
          setBusy(true);
          const { data: created, error } = await supabase
            .from('setlists')
            .insert({
              church_id: church.id,
              title: `${setlist.title} (cópia)`,
              date: setlist.date,
              time: setlist.time,
              location: setlist.location,
              notes: setlist.notes,
              status: 'draft',
              created_by: user.id,
            })
            .select()
            .single();
          if (error || !created) {
            setBusy(false);
            Alert.alert('Erro', formatSupabaseError(error));
            return;
          }
          if (songs.length) {
            await supabase.from('setlist_songs').insert(
              songs.map((s, i) => ({
                setlist_id: created.id,
                song_id: s.song_id,
                position: i,
                notes: s.notes,
              }))
            );
          }
          if (members.length) {
            await supabase.from('setlist_members').insert(
              members.map((m) => ({
                setlist_id: created.id,
                user_id: m.user_id,
                instrument: m.instrument,
                status: 'pending',
              }))
            );
          }
          setBusy(false);
          toast.success('Escala duplicada');
          navigation.replace('SetlistDetail', { setlistId: created.id });
        },
      },
    ]);
  };

  const deleteSetlist = () => {
    Alert.alert('Excluir escala', 'Esta ação não pode ser desfeita. Músicas do repertório não serão apagadas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.from('setlists').delete().eq('id', setlistId);
          setBusy(false);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScreenHeader title="Escala" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !setlist) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScreenHeader title="Escala" />
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={error ?? 'Escala não encontrada.'}
          actionLabel="Tentar novamente"
          onAction={load}
        />
      </SafeAreaView>
    );
  }

  const statusKey = (setlist.status as SetlistStatus) || 'scheduled';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader
        title="Escala"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconButton
              icon="chatbubble-ellipses-outline"
              onPress={openSetlistChat}
              accessibilityLabel="Chat da escala"
            />
            {canManage ? (
              <IconButton
                icon="ellipsis-horizontal"
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="Mais opções"
              />
            ) : null}
          </View>
        }
      />
      <ActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Ações da escala"
        items={[
          {
            key: 'edit',
            label: 'Editar',
            icon: 'create-outline',
            onPress: () => navigation.navigate('SetlistForm', { setlistId }),
          },
          {
            key: 'duplicate',
            label: 'Duplicar',
            icon: 'copy-outline',
            onPress: duplicateSetlist,
          },
          {
            key: 'delete',
            label: 'Excluir',
            icon: 'trash-outline',
            destructive: true,
            onPress: deleteSetlist,
          },
        ] as ActionMenuItem[]}
      />
      <ActionMenu
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Adicionar músico"
        items={available.map((m) => ({
          key: m.user_id,
          label: m.profile?.name ?? 'Músico',
          icon: 'person-add-outline' as const,
          onPress: () => addMember(m),
        }))}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {setlist.title}
        </Text>
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <Badge
            label={SETLIST_STATUS_LABELS[statusKey] ?? statusKey}
            tone={
              statusKey === 'confirmed'
                ? 'success'
                : statusKey === 'cancelled'
                  ? 'danger'
                  : statusKey === 'completed'
                    ? 'neutral'
                    : 'inverse'
            }
          />
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {formatDateBR(setlist.date)}
          {setlist.time ? ` · ${formatTime(setlist.time)}` : ''}
        </Text>
        {setlist.location ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {setlist.location}
          </Text>
        ) : null}
        {setlist.notes ? (
          <Text style={[styles.notes, { color: colors.textSecondary }]}>{setlist.notes}</Text>
        ) : null}

        {myMember ? (
          <View style={[styles.presenceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.section, { color: colors.textMuted, marginTop: 0 }]}>Sua presença</Text>
            <Text style={[styles.presenceCurrent, { color: colors.text }]}>
              Status: {MEMBER_STATUS_LABELS[myMember.status]}
            </Text>
            <View style={styles.presenceRow}>
              <Button
                title="Confirmar"
                onPress={() => updateMyStatus('confirmed')}
                loading={busy}
                style={styles.presenceBtn}
              />
              <Button
                title="Não poderei"
                onPress={() => updateMyStatus('declined')}
                variant="secondary"
                loading={busy}
                style={styles.presenceBtn}
              />
              <Button
                title="Pendente"
                onPress={() => updateMyStatus('pending')}
                variant="ghost"
                loading={busy}
                style={styles.presenceBtn}
              />
            </View>
          </View>
        ) : null}

        <Text style={[styles.section, { color: colors.textMuted }]}>
          Repertório ({songs.length})
        </Text>
        {songs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Nenhuma música nesta escala.
          </Text>
        ) : (
          <View
            style={[
              styles.listSurface,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {songs.map((ss, idx) => (
              <Pressable
                key={ss.id}
                onPress={() =>
                  ss.song_id && navigation.navigate('SongDetail', { songId: ss.song_id })
                }
                style={({ pressed }) => [
                  styles.songRow,
                  {
                    backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                    borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.posBadge, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.posText, { color: colors.text }]}>{idx + 1}</Text>
                </View>

                {ss.song?.artwork_url ? (
                  <Image source={{ uri: ss.song.artwork_url }} style={styles.thumb} />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>♪</Text>
                  </View>
                )}

                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                    {ss.song?.title ?? '—'}
                  </Text>
                  <Text style={[styles.songKey, { color: colors.textSecondary }]} numberOfLines={1}>
                    {[ss.song?.artist, ss.song?.key ? `Tom ${ss.song.key}` : null]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </Text>
                </View>

                {canManage ? (
                  <View style={styles.songActions}>
                    <IconButton
                      icon="chevron-up"
                      size={18}
                      onPress={() => moveSong(idx, -1)}
                      disabled={idx === 0 || busy}
                      accessibilityLabel="Mover para cima"
                      style={{ width: 32, height: 32, opacity: idx === 0 ? 0.28 : 1 }}
                    />
                    <IconButton
                      icon="chevron-down"
                      size={18}
                      onPress={() => moveSong(idx, 1)}
                      disabled={idx === songs.length - 1 || busy}
                      accessibilityLabel="Mover para baixo"
                      style={{
                        width: 32,
                        height: 32,
                        opacity: idx === songs.length - 1 ? 0.28 : 1,
                      }}
                    />
                    <IconButton
                      icon="trash-outline"
                      size={16}
                      color={colors.danger}
                      onPress={() => removeSong(ss)}
                      disabled={busy}
                      accessibilityLabel="Remover música"
                      style={{ width: 32, height: 32 }}
                    />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
        {canManage ? (
          <Pressable
            onPress={openPicker}
            style={({ pressed }) => [
              styles.compactAdd,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.compactAddText, { color: colors.text }]}>
              +  Adicionar música
            </Text>
          </Pressable>
        ) : null}

        <Text style={[styles.section, { color: colors.textMuted }]}>
          Equipe ({members.length})
        </Text>
        {members.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Nenhum integrante nesta escala.
          </Text>
        ) : (
          <View
            style={[
              styles.listSurface,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {members.map((m, idx) => (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  {
                    borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <Avatar uri={m.profile?.avatar_url} name={m.profile?.name} size={40} />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {m.profile?.name ?? 'Músico'}
                  </Text>
                  <Text style={[styles.memberMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {[m.instrument, MEMBER_STATUS_LABELS[m.status]].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {canManage ? (
                  <IconButton
                    icon="trash-outline"
                    size={16}
                    color={colors.danger}
                    onPress={() => removeMember(m)}
                    disabled={busy}
                    accessibilityLabel="Remover músico"
                    style={{ width: 36, height: 36 }}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}
        {canManage ? (
          <Pressable
            onPress={openMemberPicker}
            style={({ pressed }) => [
              styles.compactAdd,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
                marginTop: 4,
              },
            ]}
          >
            <Text style={[styles.compactAddText, { color: colors.text }]}>
              +  Adicionar músico
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1 },
  meta: { ...typography.body, marginTop: spacing.xs },
  notes: { ...typography.body, marginTop: spacing.md },
  section: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  empty: { ...typography.body },
  presenceBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presenceCurrent: { ...typography.body, marginBottom: spacing.sm },
  presenceRow: { gap: spacing.xs },
  presenceBtn: { marginTop: spacing.xs },
  listSurface: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  posBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { ...typography.cardTitle },
  songKey: { ...typography.small, marginTop: 2 },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAdd: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginBottom: 4,
  },
  compactAddText: {
    ...typography.label,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { ...typography.cardTitle },
  memberMeta: { ...typography.small, marginTop: 2 },
});
