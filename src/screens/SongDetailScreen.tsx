import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Song, SongMaterial, UserSongNote } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { colors, spacing, typography, radius } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ActionMenu, ActionMenuItem } from '../components/ActionMenu';

export function SongDetailScreen() {
  const { user, membership } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const songId = route.params?.songId as string;

  const [song, setSong] = useState<Song | null>(null);
  const [materials, setMaterials] = useState<SongMaterial[]>([]);
  const [note, setNote] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: mats }, { data: notes }] = await Promise.all([
      supabase.from('songs').select('*').eq('id', songId).single(),
      supabase.from('song_materials').select('*').eq('song_id', songId).order('created_at'),
      user
        ? supabase.from('user_song_notes').select('*').eq('song_id', songId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setSong(s);
    setMaterials(mats ?? []);
    if (notes) {
      setNote(notes.content);
      setNoteId(notes.id);
    }
    setLoading(false);
  }, [songId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openSpotify = () => {
    if (song?.spotify_url) {
      Linking.openURL(song.spotify_url).catch(() =>
        Alert.alert('Erro', 'Não foi possível abrir o Spotify')
      );
    }
  };

  const openMaterial = (m: SongMaterial) => {
    if (m.type === 'chord' || m.type === 'note') {
      navigation.navigate('ChordViewer', { materialId: m.id, title: m.title, content: m.content });
      return;
    }
    if (m.url) {
      Linking.openURL(m.url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link'));
    }
  };

  const saveNote = async () => {
    if (!user) return;
    setSavingNote(true);
    if (noteId) {
      await supabase.from('user_song_notes').update({ content: note }).eq('id', noteId);
    } else if (note.trim()) {
      const { data } = await supabase
        .from('user_song_notes')
        .insert({ user_id: user.id, song_id: songId, content: note })
        .select()
        .single();
      if (data) setNoteId(data.id);
    }
    setSavingNote(false);
  };

  if (loading || !song) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Música" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title="Música"
        right={
          <IconButton
            icon="ellipsis-horizontal"
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Mais opções"
          />
        }
      />
      <ActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Ações da música"
        items={[
          {
            key: 'edit',
            label: 'Editar',
            icon: 'create-outline',
            onPress: () => navigation.navigate('SongForm', { songId }),
          },
        ] as ActionMenuItem[]}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {song.artwork_url ? (
          <Image source={{ uri: song.artwork_url }} style={styles.artwork} />
        ) : null}
        <Text style={styles.title}>{song.title}</Text>
        {song.artist ? <Text style={styles.artist}>{song.artist}</Text> : null}
        {song.album ? <Text style={styles.artist}>{song.album}</Text> : null}

        {song.spotify_url ? (
          <TouchableOpacity style={styles.spotifyBtn} onPress={openSpotify}>
            <Text style={styles.spotifyBtnText}>Abrir no Spotify</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.metaRow}>
          {song.key ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{song.key}</Text>
            </View>
          ) : null}
          {song.bpm ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{song.bpm} BPM</Text>
            </View>
          ) : null}
        </View>

        {song.notes ? <Text style={styles.notes}>{song.notes}</Text> : null}

        <Text style={styles.section}>Materiais</Text>
        {materials.length === 0 ? (
          <Text style={styles.empty}>Nenhum material cadastrado</Text>
        ) : (
          materials.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.material}
              onPress={() => openMaterial(m)}
              onLongPress={
                canManage
                  ? () => {
                      Alert.alert('Excluir material', `Excluir "${m.title}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Excluir',
                          style: 'destructive',
                          onPress: async () => {
                            const { error } = await supabase
                              .from('song_materials')
                              .delete()
                              .eq('id', m.id);
                            if (error) Alert.alert('Erro', formatSupabaseError(error));
                            else load();
                          },
                        },
                      ]);
                    }
                  : undefined
              }
            >
              <Text style={styles.materialType}>{labelType(m.type)}</Text>
              <Text style={styles.materialTitle}>{m.title}</Text>
            </TouchableOpacity>
          ))
        )}

        <Button
          title="Adicionar material"
          onPress={() => navigation.navigate('MaterialForm', { songId })}
          variant="secondary"
          style={{ marginTop: spacing.sm }}
        />

        <Text style={styles.section}>Minha anotação</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Anotações pessoais (só você vê)"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
        <Button title="Salvar anotação" onPress={saveNote} loading={savingNote} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

function labelType(t: string) {
  const map: Record<string, string> = {
    youtube: 'YouTube',
    spotify: 'Spotify',
    external_link: 'Link',
    pdf: 'PDF',
    chord: 'Cifra',
    note: 'Nota',
  };
  return map[t] ?? t;
}

const styles = StyleSheet.create({
  artwork: { width: 160, height: 160, borderRadius: 12, alignSelf: 'center', marginBottom: 16 },
  spotifyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1DB954',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  spotifyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  back: { ...typography.body, color: colors.primary },
  edit: { ...typography.bodyMedium, color: colors.primary },
  title: { ...typography.h1, color: colors.text },
  artist: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
  notes: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  section: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  empty: { ...typography.body, color: colors.textMuted },
  material: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  materialType: { ...typography.small, color: colors.primary, fontWeight: '600' },
  materialTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 100,
    ...typography.body,
    color: colors.text,
  },
});
