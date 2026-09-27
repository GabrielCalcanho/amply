import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song, SongMaterial } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, radius, type ThemeColors } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ActionMenu, ActionMenuItem } from '../components/ActionMenu';
import { EmptyState } from '../components/EmptyState';

export function SongDetailScreen() {
  const { user, membership } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const songId = route.params?.songId as string;

  const [song, setSong] = useState<Song | null>(null);
  const [materials, setMaterials] = useState<SongMaterial[]>([]);
  const [note, setNote] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: s, error: songError }, { data: mats }, { data: notes }] = await Promise.all([
      supabase.from('songs').select('*').eq('id', songId).single(),
      supabase.from('song_materials').select('*').eq('song_id', songId).order('created_at'),
      user
        ? supabase.from('user_song_notes').select('*').eq('song_id', songId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (songError) setError(formatSupabaseError(songError));
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
    let noteError: { message: string; details?: string; hint?: string; code?: string } | null = null;
    if (noteId) {
      ({ error: noteError } = await supabase.from('user_song_notes').update({ content: note }).eq('id', noteId));
    } else if (note.trim()) {
      const { data, error } = await supabase
        .from('user_song_notes')
        .insert({ user_id: user.id, song_id: songId, content: note })
        .select()
        .single();
      noteError = error;
      if (data) setNoteId(data.id);
    }
    if (noteError) Alert.alert('Erro', formatSupabaseError(noteError));
    setSavingNote(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Música" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !song) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Música" />
        <View style={styles.center}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar"
            description={error ?? 'Música não encontrada.'}
            actionLabel="Tentar novamente"
            onAction={load}
          />
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
          <Pressable
            style={({ pressed }) => [styles.spotifyBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={openSpotify}
            accessibilityRole="button"
            accessibilityLabel="Abrir no Spotify"
          >
            <Text style={styles.spotifyBtnText}>Abrir no Spotify</Text>
          </Pressable>
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
          <View style={styles.materialList}>
            {materials.map((m, idx) => (
              <Pressable
                key={m.id}
                style={({ pressed }) => [
                  styles.material,
                  pressed && styles.materialPressed,
                  idx < materials.length - 1 && styles.materialDivider,
                ]}
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
                              const { error: delError } = await supabase
                                .from('song_materials')
                                .delete()
                                .eq('id', m.id);
                              if (delError) Alert.alert('Erro', formatSupabaseError(delError));
                              else load();
                            },
                          },
                        ]);
                      }
                    : undefined
                }
                accessibilityRole="button"
                accessibilityLabel={`${labelType(m.type)}: ${m.title}`}
                accessibilityHint={canManage ? 'Toque para abrir. Toque longo para excluir.' : 'Toque para abrir.'}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.materialType}>{labelType(m.type)}</Text>
                  <Text style={styles.materialTitle} numberOfLines={2}>{m.title}</Text>
                </View>
              </Pressable>
            ))}
          </View>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    artwork: { width: 160, height: 160, borderRadius: radius.md, alignSelf: 'center', marginBottom: spacing.md },
    spotifyBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    spotifyBtnText: { color: colors.textInverse, fontWeight: '600', fontSize: 14 },

    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { padding: spacing.lg, paddingBottom: spacing.xxl },
    title: { ...typography.h1, color: colors.text },
    artist: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
    metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    badge: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    badgeText: { ...typography.caption, color: colors.text, fontWeight: '600' },
    notes: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
    section: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    empty: { ...typography.body, color: colors.textMuted },
    materialList: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    material: {
      padding: spacing.md,
    },
    materialPressed: { backgroundColor: colors.surfaceSecondary },
    materialDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    materialType: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
    materialTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
    noteInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      minHeight: 100,
      ...typography.body,
      color: colors.text,
    },
  });
}
