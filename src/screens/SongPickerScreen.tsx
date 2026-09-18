import React, {useCallback, useState, useMemo} from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { formatSupabaseError } from '../utils/payload';

export function SongPickerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const setlistId = route.params?.setlistId as string;
  const excludeIds: string[] = route.params?.excludeIds ?? [];

  const [songs, setSongs] = useState<Song[]>([]);
  const [filtered, setFiltered] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('church_id', church.id)
      .order('title');
    const available = (data ?? []).filter((s) => !excludeIds.includes(s.id));
    setSongs(available);
    setFiltered(available);
    setLoading(false);
  }, [church, excludeIds]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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
          (s.artist && s.artist.toLowerCase().includes(q))
      )
    );
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      Alert.alert('Selecione', 'Escolha ao menos uma música.');
      return;
    }
    if (!setlistId) {
      Alert.alert('Erro', 'Escala inválida.');
      return;
    }

    setSaving(true);

    const { data: existing } = await supabase
      .from('setlist_songs')
      .select('position')
      .eq('setlist_id', setlistId)
      .order('position', { ascending: false })
      .limit(1);

    const startPos =
      existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 0;

    const rows = Array.from(selected).map((songId, i) => ({
      setlist_id: setlistId,
      song_id: songId,
      position: startPos + i,
    }));

    const { error } = await supabase.from('setlist_songs').insert(rows);
    setSaving(false);

    if (error) {
      Alert.alert('Erro', formatSupabaseError(error));
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title="Adicionar músicas"
        right={
          <TouchableOpacity onPress={handleAdd} disabled={saving || selected.size === 0}>
            <Text style={[styles.add, (saving || selected.size === 0) && styles.disabled]}>
              {saving ? '...' : `Add${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Nenhuma música" description="Cadastre músicas primeiro" />
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.check, isSelected && styles.checkOn]}>
                {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {[item.artist, item.key].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { ...typography.body, color: colors.textSecondary },
  title: { ...typography.bodyMedium, color: colors.text },
  add: { ...typography.bodyMedium, color: colors.primary },
  disabled: { opacity: 0.4 },
  searchBox: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  search: {
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemTitle: { ...typography.bodyMedium, color: colors.text },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
})
}

