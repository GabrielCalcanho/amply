import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song, SongMaterial } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Button } from '../components/Button';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';

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

function typeIcon(t: string): keyof typeof Ionicons.glyphMap {
  if (t === 'chord' || t === 'note') return 'document-text-outline';
  if (t === 'youtube') return 'logo-youtube';
  if (t === 'spotify') return 'musical-notes-outline';
  if (t === 'pdf') return 'document-outline';
  return 'link-outline';
}

export function SongDetailScreen() {
  const { user, membership } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const songId = route.params?.songId as string;

  const [song, setSong] = useState<Song | null>(null);
  const [materials, setMaterials] = useState<SongMaterial[]>([]);
  const [note, setNote] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: mats }, { data: notes }] = await Promise.all([
      supabase.from('songs').select('*').eq('id', songId).single(),
      supabase
        .from('song_materials')
        .select('*')
        .eq('song_id', songId)
        .order('created_at'),
      user
        ? supabase
            .from('user_song_notes')
            .select('*')
            .eq('song_id', songId)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setSong(s);
    setMaterials(mats ?? []);
    if (notes) {
      setNote(notes.content);
      setNoteId(notes.id);
    } else {
      setNote('');
      setNoteId(null);
    }
    setLoading(false);
  }, [songId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openExternal = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o link')
    );
  };

  const openMaterial = (m: SongMaterial) => {
    if (m.type === 'chord' || m.type === 'note') {
      navigation.navigate('ChordViewer', {
        materialId: m.id,
        title: m.title,
        content: m.content,
      });
      return;
    }
    if (m.url) openExternal(m.url);
  };

  const saveNote = async () => {
    if (!user) return;
    setSavingNote(true);
    if (noteId) {
      await supabase
        .from('user_song_notes')
        .update({ content: note })
        .eq('id', noteId);
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

  const toggleFavorite = async () => {
    if (!song) return;
    const next = !song.is_favorite;
    const { error } = await supabase
      .from('songs')
      .update({ is_favorite: next })
      .eq('id', song.id);
    if (!error) setSong({ ...song, is_favorite: next });
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
          canManage ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('SongForm', { songId })}
              hitSlop={8}
            >
              <Text style={styles.edit}>Editar</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          {song.artwork_url ? (
            <Image source={{ uri: song.artwork_url }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPh]}>
              <Ionicons
                name="musical-notes"
                size={40}
                color={colors.primary}
              />
            </View>
          )}
          <View style={styles.heroText}>
            <Text style={styles.title}>{song.title}</Text>
            {song.artist ? (
              <Text style={styles.artist}>{song.artist}</Text>
            ) : null}
            {song.album ? (
              <Text style={styles.album}>{song.album}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={toggleFavorite}
            style={styles.favBtn}
            hitSlop={10}
            accessibilityLabel={
              song.is_favorite ? 'Remover dos favoritos' : 'Favoritar'
            }
          >
            <Ionicons
              name={song.is_favorite ? 'heart' : 'heart-outline'}
              size={24}
              color={song.is_favorite ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Meta pills */}
        <View style={styles.metaRow}>
          {song.key ? (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Tom</Text>
              <Text style={styles.pillValue}>{song.key}</Text>
            </View>
          ) : null}
          {song.bpm ? (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>BPM</Text>
              <Text style={styles.pillValue}>{song.bpm}</Text>
            </View>
          ) : null}
        </View>

        {/* Links externos */}
        {song.spotify_url ? (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openExternal(song.spotify_url)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="musical-notes-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.linkBtnText}>Ouvir / abrir link externo</Text>
            <Ionicons
              name="open-outline"
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}

        {song.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.section}>Observações</Text>
            <Text style={styles.notes}>{song.notes}</Text>
          </View>
        ) : null}

        {/* Materiais */}
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
                            if (error)
                              Alert.alert('Erro', formatSupabaseError(error));
                            else load();
                          },
                        },
                      ]);
                    }
                  : undefined
              }
              activeOpacity={0.75}
            >
              <View style={styles.materialIcon}>
                <Ionicons
                  name={typeIcon(m.type)}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialType}>{labelType(m.type)}</Text>
                <Text style={styles.materialTitle} numberOfLines={1}>
                  {m.title}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ))
        )}

        {canManage ? (
          <Button
            title="Adicionar material"
            onPress={() => navigation.navigate('MaterialForm', { songId })}
            variant="secondary"
            style={{ marginTop: spacing.sm }}
          />
        ) : null}

        {/* Anotação pessoal */}
        <Text style={styles.section}>Minha anotação</Text>
        <Text style={styles.noteHint}>Só você vê estas anotações</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Acordes, dicas de arranjo, lembretes…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
        <Button
          title="Salvar anotação"
          onPress={saveNote}
          loading={savingNote}
          variant="ghost"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    edit: {
      ...typography.bodyMedium,
      color: colors.primary,
    },

    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    artwork: {
      width: 88,
      height: 88,
      borderRadius: radius.md,
    },
    artworkPh: {
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: { flex: 1, minWidth: 0 },
    title: {
      ...typography.h2,
      color: colors.text,
    },
    artist: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 4,
    },
    album: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    favBtn: {
      padding: spacing.xs,
    },

    metaRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    pill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 72,
    },
    pillLabel: {
      ...typography.small,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    pillValue: {
      ...typography.bodyMedium,
      color: colors.text,
      marginTop: 2,
    },

    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    linkBtnText: {
      ...typography.bodyMedium,
      color: colors.text,
      flex: 1,
    },

    notesBlock: {
      marginBottom: spacing.sm,
    },
    notes: {
      ...typography.body,
      color: colors.textSecondary,
    },

    section: {
      ...typography.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
    },

    material: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    materialIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    materialType: {
      ...typography.small,
      color: colors.primary,
      fontWeight: '600',
    },
    materialTitle: {
      ...typography.bodyMedium,
      color: colors.text,
      marginTop: 2,
    },

    noteHint: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      marginTop: -4,
    },
    noteInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      minHeight: 110,
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.sm,
    },
  });
}
