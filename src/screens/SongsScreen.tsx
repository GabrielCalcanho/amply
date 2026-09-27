import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { AppHeader } from '../components/layout/AppHeader';
import { SearchField } from '../components/SearchField';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song } from '../types';
import { spacing, radius, shadow, typography } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';

export function SongsScreen() {
  const { church, membership } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filtered, setFiltered] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const canCreate = !!membership;

  const loadSongs = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('church_id', church.id)
      .order('is_favorite', { ascending: false })
      .order('title');
    if (error) {
      setError(formatSupabaseError(error));
    } else if (data) {
      setSongs(data);
      setFiltered(data);
    }
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      loadSongs();
    }, [loadSongs])
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    const q = text.toLowerCase().trim();
    if (!q) {
      setFiltered(songs);
      return;
    }
    setFiltered(
      songs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.artist && s.artist.toLowerCase().includes(q)) ||
          (s.key && s.key.toLowerCase().includes(q))
      )
    );
  };

  const toggleFavorite = async (song: Song) => {
    const next = !song.is_favorite;
    const { error } = await supabase.from('songs').update({ is_favorite: next }).eq('id', song.id);
    if (!error) {
      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, is_favorite: next } : s)));
      setFiltered((prev) => prev.map((s) => (s.id === song.id ? { ...s, is_favorite: next } : s)));
    }
  };

  const handleDelete = (song: Song) => {
    Alert.alert('Excluir música', `Excluir "${song.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('songs').delete().eq('id', song.id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else loadSongs();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <TabScreenShell>
        <AppHeader title="Músicas" showNotifications={false} showAvatar={false} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </TabScreenShell>
    );
  }

  if (error) {
    return (
      <TabScreenShell>
        <AppHeader title="Músicas" showNotifications={false} showAvatar={false} />
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={loadSongs}
        />
      </TabScreenShell>
    );
  }

  return (
    <TabScreenShell>
      <AppHeader
        title="Músicas"
        showNotifications={false}
        showAvatar={false}
        right={
          canCreate ? (
            <Pressable
              onPress={() => navigation.navigate('SongForm')}
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
        <SearchField
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar música, artista, tom..."
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title="Nenhuma música no repertório"
            description={
              canCreate
                ? 'Cadastre a primeira música do ministério.'
                : 'Aguarde o líder cadastrar músicas.'
            }
            actionLabel={canCreate ? 'Adicionar música' : undefined}
            onAction={canCreate ? () => navigation.navigate('SongForm') : undefined}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('SongDetail', { songId: item.id })}
            onLongPress={canManage ? () => handleDelete(item) : undefined}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.xl,
                opacity: pressed ? 0.92 : 1,
                ...shadow.sm,
              },
            ]}
          >
            {item.artwork_url ? (
              <Image source={{ uri: item.artwork_url }} style={styles.cover} />
            ) : (
              <View
                style={[
                  styles.cover,
                  styles.coverPh,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="musical-note" size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {[item.artist, item.key].filter(Boolean).join(' · ') || '—'}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleFavorite(item)}
              hitSlop={12}
              style={styles.fav}
            >
              <Ionicons
                name={item.is_favorite ? 'heart' : 'heart-outline'}
                size={20}
                color={item.is_favorite ? colors.danger : colors.textMuted}
              />
            </Pressable>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  coverPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.cardTitle,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
  fav: {
    padding: 6,
    marginRight: 4,
  },
});
