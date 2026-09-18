import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
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
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { notifyUsers } from '../utils/notifications';
import { Button } from '../components/Button';
import { formatSupabaseError } from '../utils/payload';
import { formatDateBR, formatTime } from '../utils/dates';

type SongRow = SetlistSong & { song: Song };

export function SetlistDetailScreen() {
  const { membership, church, user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const setlistId = route.params?.setlistId as string;

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [members, setMembers] = useState<SetlistMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const myMember = members.find((m) => m.user_id === user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s, error: e1 }, { data: ss, error: e2 }, { data: sm, error: e3 }] =
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
    if (e1) console.warn('setlist load', e1.message);
    if (e2) console.warn('setlist_songs load', e2.message);
    if (e3) console.warn('setlist_members load', e3.message);
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

  const addMember = async () => {
    if (!church) return;
    const { data: team } = await supabase
      .from('church_members')
      .select('user_id, instrument, profile:profiles(name)')
      .eq('church_id', church.id);

    const existing = new Set(members.map((m) => m.user_id));
    const available = (team ?? []).filter((m) => !existing.has(m.user_id));

    if (available.length === 0) {
      Alert.alert('Aviso', 'Todos os membros já estão nesta escala.');
      return;
    }

    const choices = available.slice(0, 8);
    Alert.alert('Adicionar músico', 'Selecione:', [
      ...choices.map((m: any) => ({
        text: m.profile?.name ?? 'Músico',
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.from('setlist_members').insert({
            setlist_id: setlistId,
            user_id: m.user_id,
            instrument: m.instrument,
            status: 'pending',
          });
          setBusy(false);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else {
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
          }
        },
      })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
      Alert.alert('Sucesso', MEMBER_STATUS_LABELS[status]);
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
          Alert.alert('Sucesso', 'Escala duplicada como rascunho.');
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

  if (loading || !setlist) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Setlist" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const statusKey = (setlist.status as SetlistStatus) || 'scheduled';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title="Setlist"
        right={
          canManage ? (
            <View style={styles.topActions}>
              <TouchableOpacity onPress={duplicateSetlist}>
                <Text style={styles.edit}>Duplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('SetlistForm', { setlistId })}>
                <Text style={styles.edit}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteSetlist}>
                <Text style={styles.delete}>Excluir</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{setlist.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{SETLIST_STATUS_LABELS[statusKey] ?? statusKey}</Text>
        </View>
        <Text style={styles.meta}>
          {formatDateBR(setlist.date)}
          {setlist.time ? ` · ${formatTime(setlist.time)}` : ''}
        </Text>
        {setlist.location ? <Text style={styles.meta}>{setlist.location}</Text> : null}
        {setlist.notes ? <Text style={styles.notes}>{setlist.notes}</Text> : null}

        {myMember ? (
          <View style={styles.presenceBox}>
            <Text style={styles.section}>Sua presença</Text>
            <Text style={styles.presenceCurrent}>
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

        <Text style={styles.section}>Repertório ({songs.length})</Text>
        {songs.length === 0 ? (
          <Text style={styles.empty}>Nenhuma música nesta escala.</Text>
        ) : (
          songs.map((ss, idx) => (
            <View key={ss.id} style={styles.songItem}>
              <TouchableOpacity
                style={styles.songMain}
                onPress={() =>
                  ss.song_id && navigation.navigate('SongDetail', { songId: ss.song_id })
                }
              >
                <Text style={styles.songPos}>{idx + 1}</Text>
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle}>{ss.song?.title ?? '—'}</Text>
                  <Text style={styles.songKey}>
                    {[ss.song?.artist, ss.song?.key].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </TouchableOpacity>
              {canManage ? (
                <View style={styles.songActions}>
                  <TouchableOpacity
                    onPress={() => moveSong(idx, -1)}
                    disabled={idx === 0 || busy}
                  >
                    <Text style={[styles.actionBtn, idx === 0 && styles.actionDisabled]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveSong(idx, 1)}
                    disabled={idx === songs.length - 1 || busy}
                  >
                    <Text
                      style={[
                        styles.actionBtn,
                        idx === songs.length - 1 && styles.actionDisabled,
                      ]}
                    >
                      ↓
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSong(ss)} disabled={busy}>
                    <Text style={[styles.actionBtn, { color: colors.danger }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        )}
        {canManage ? (
          <Button title="Adicionar músicas" onPress={openPicker} variant="secondary" />
        ) : null}

        <Text style={styles.section}>Equipe ({members.length})</Text>
        {members.length === 0 ? (
          <Text style={styles.empty}>Nenhum integrante nesta escala.</Text>
        ) : (
          members.map((m) => (
            <View key={m.id} style={styles.memberItem}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.profile?.name ?? 'Músico'}</Text>
                <Text style={styles.memberMeta}>
                  {[m.instrument, MEMBER_STATUS_LABELS[m.status]].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {canManage ? (
                <TouchableOpacity onPress={() => removeMember(m)} disabled={busy}>
                  <Text style={{ color: colors.danger }}>Remover</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
        {canManage ? (
          <Button
            title="Adicionar músico"
            onPress={addMember}
            variant="secondary"
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  topActions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'flex-end' },
  back: { ...typography.body, color: colors.primary },
  edit: { ...typography.body, color: colors.primary },
  delete: { ...typography.body, color: colors.danger },
  title: { ...typography.h1, color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  badgeText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
  meta: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  notes: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  section: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  empty: { ...typography.body, color: colors.textMuted },
  presenceBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presenceCurrent: { ...typography.body, color: colors.text, marginBottom: spacing.sm },
  presenceRow: { gap: spacing.xs },
  presenceBtn: { marginTop: spacing.xs },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  songMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  songPos: { ...typography.bodyMedium, color: colors.primary, width: 28 },
  songInfo: { flex: 1 },
  songTitle: { ...typography.bodyMedium, color: colors.text },
  songKey: { ...typography.caption, color: colors.textSecondary },
  songActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { ...typography.body, color: colors.textSecondary, padding: spacing.xs },
  actionDisabled: { opacity: 0.3 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  memberInfo: { flex: 1 },
  memberName: { ...typography.bodyMedium, color: colors.text },
  memberMeta: { ...typography.caption, color: colors.textSecondary },
});
}

