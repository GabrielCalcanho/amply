import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Song } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { formatSupabaseError } from '../utils/payload';

type Filter = 'all' | 'favorites';

export function SongsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership } = useAuth();
  const navigation = useNavigation<any>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const canCreate = !!membership;

  const loadSongs = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('church_id', church.id)
      .order('is_favorite', { ascending: false })
      .order('title');
    if (!error && data) {
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
    let list = songs;
    if (filter === 'favorites') {
      list = list.filter((s) => s.is_favorite);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.artist && s.artist.toLowerCase().includes(q))
      );
    }
    return list;
  }, [songs, search, filter]);

  const toggleFavorite = async (song: Song) => {
    const next = !song.is_favorite;
    const { error } = await supabase
      .from('songs')
      .update({ is_favorite: next })
      .eq('id', song.id);
    if (!error) {
      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, is_favorite: next } : s))
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
          const { error } = await supabase
            .from('songs')
            .delete()
            .eq('id', song.id);
          if (error) {
            Alert.alert('Erro', formatSupabaseError(error));
          } else {
            loadSongs();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <TabScreenShell>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </TabScreenShell>
    );
  }

  return (
    <TabScreenShell>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Músicas</Text>
          {canCreate ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('SongForm')}
              style={styles.addBtn}
              hitSlop={8}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.search}
            placeholder="Buscar música..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.chip, filter === 'all' && styles.chipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                filter === 'all' && styles.chipTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, filter === 'favorites' && styles.chipActive]}
            onPress={() => setFilter('favorites')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={filter === 'favorites' ? 'heart' : 'heart-outline'}
              size={14}
              color={
                filter === 'favorites' ? colors.primaryDark : colors.textSecondary
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.chipText,
                filter === 'favorites' && styles.chipTextActive,
              ]}
            >
              Favoritas
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title={
                filter === 'favorites'
                  ? 'Nenhuma favorita'
                  : 'Repertório vazio'
              }
              description={
                filter === 'favorites'
                  ? 'Marque músicas com o coração para vê-las aqui.'
                  : 'Adicione a primeira música do ministério.'
              }
              actionLabel={
                filter === 'all' && (canManage || canCreate)
                  ? 'Adicionar música'
                  : undefined
              }
              onAction={
                filter === 'all' && (canManage || canCreate)
                  ? () => navigation.navigate('SongForm')
                  : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SongDetail', { songId: item.id })
              }
              onLongPress={canManage ? () => handleDelete(item) : undefined}
            >
              <TouchableOpacity
                onPress={() => toggleFavorite(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.favBtn}
              >
                <Ionicons
                  name={item.is_favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={
                    item.is_favorite ? colors.primary : colors.textMuted
                  }
                />
              </TouchableOpacity>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {[item.artist, item.key].filter(Boolean).join(' · ') ||
                    'Sem artista'}
                </Text>
              </View>
              {item.bpm ? (
                <Text style={styles.bpm}>{item.bpm} bpm</Text>
              ) : null}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    </TabScreenShell>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: {
      ...typography.h2,
      color: colors.text,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.full,
      paddingHorizontal: spacing.lg,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    search: {
      flex: 1,
      height: 44,
      ...typography.body,
      color: colors.text,
    },
    filters: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryMuted,
    },
    chipText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipTextActive: {
      color: colors.primaryDark,
      fontWeight: '600',
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      flexGrow: 1,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    favBtn: {
      padding: 2,
    },
    itemContent: {
      flex: 1,
      minWidth: 0,
    },
    itemTitle: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    itemMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    bpm: {
      ...typography.small,
      color: colors.textMuted,
    },
  });
}
