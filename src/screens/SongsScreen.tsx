import React, { useCallback, useMemo, useState } from 'react';
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
import { spacing, radius, typography } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';

function FilterChip({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSecondary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={14} color={active ? colors.textInverse : colors.textSecondary} />
      <Text style={[styles.chipText, { color: active ? colors.textInverse : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SongsScreen() {
  const { church, membership } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
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
    }
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      loadSongs();
    }, [loadSongs])
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return songs.filter((s) => {
      if (favOnly && !s.is_favorite) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.artist ?? '').toLowerCase().includes(q) ||
        (s.key ?? '').toLowerCase().includes(q)
      );
    });
  }, [songs, search, favOnly]);

  const favoriteCount = useMemo(() => songs.filter((s) => s.is_favorite).length, [songs]);

  const toggleFavorite = async (song: Song) => {
    const next = !song.is_favorite;
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, is_favorite: next } : s)));
    const { error } = await supabase.from('songs').update({ is_favorite: next }).eq('id', song.id);
    if (error) {
      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, is_favorite: song.is_favorite } : s))
      );
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
          onChangeText={setSearch}
          placeholder="Buscar música, artista, tom..."
        />
        <View style={styles.chips}>
          <FilterChip
            active={!favOnly}
            label="Todas"
            icon="albums-outline"
            onPress={() => setFavOnly(false)}
          />
          {favoriteCount > 0 ? (
            <FilterChip
              active={favOnly}
              label={`Favoritas (${favoriteCount})`}
              icon="heart"
              onPress={() => setFavOnly((v) => !v)}
            />
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={[
          styles.listSurface,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title={favOnly ? 'Nenhuma favorita' : 'Nenhuma música no repertório'}
            description={
              favOnly
                ? 'Toque no coração de uma música para adicioná-la às favoritas.'
                : canCreate
                  ? 'Cadastre a primeira música do ministério.'
                  : 'Aguarde o líder cadastrar músicas.'
            }
            actionLabel={!favOnly && canCreate ? 'Adicionar música' : undefined}
            onAction={!favOnly && canCreate ? () => navigation.navigate('SongForm') : undefined}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('SongDetail', { songId: item.id })}
            onLongPress={canManage ? () => handleDelete(item) : undefined}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.surfaceSecondary : 'transparent' },
            ]}
          >
            {item.artwork_url ? (
              <Image source={{ uri: item.artwork_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPh, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="musical-note" size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {[item.artist, item.key ? `Tom ${item.key}` : null].filter(Boolean).join(' · ') ||
                  'Artista não informado'}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleFavorite(item)}
              hitSlop={12}
              style={({ pressed }) => [styles.fav, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityLabel={
                item.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
              }
            >
              <Ionicons
                name={item.is_favorite ? 'heart' : 'heart-outline'}
                size={20}
                color={item.is_favorite ? colors.danger : colors.textMuted}
              />
            </Pressable>
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
  chips: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSurface: {
    marginHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  coverPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
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
  },
});
