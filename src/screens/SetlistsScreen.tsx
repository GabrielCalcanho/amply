import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { formatDateLongBR, formatTime } from '../utils/dates';

export function SetlistsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership } = useAuth();
  const navigation = useNavigation<any>();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data } = await supabase
      .from('setlists')
      .select('*, setlist_songs(count)')
      .eq('church_id', church.id)
      .order('date', { ascending: false });

    const mapped = (data ?? []).map((s: any) => ({
      ...s,
      songs_count: s.setlist_songs?.[0]?.count ?? 0,
    }));
    setSetlists(mapped);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return setlists;
    return setlists.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q))
    );
  }, [setlists, search]);

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
          <Text style={styles.title}>Setlists</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Calendar')}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {canManage ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('SetlistForm')}
                style={styles.addBtn}
                hitSlop={8}
              >
                <Ionicons name="add" size={22} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
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
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar setlist ou local"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma setlist"
              description="Crie a primeira setlist para organizar o culto."
              actionLabel={canManage ? 'Criar setlist' : undefined}
              onAction={
                canManage
                  ? () => navigation.navigate('SetlistForm')
                  : undefined
              }
            />
          }
          renderItem={({ item }) => {
            const statusKey = (item.status as SetlistStatus) || 'scheduled';
            return (
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('SetlistDetail', {
                    setlistId: item.id,
                  })
                }
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                      {SETLIST_STATUS_LABELS[statusKey] ?? statusKey}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemMeta}>
                  {formatDateLongBR(item.date)}
                  {item.time ? ` · ${formatTime(item.time)}` : ''}
                </Text>
                {item.location ? (
                  <Text style={styles.itemLoc} numberOfLines={1}>
                    {item.location}
                  </Text>
                ) : null}
                <View style={styles.itemFooter}>
                  <Text style={styles.itemSongs}>
                    {item.songs_count ?? 0}{' '}
                    {(item.songs_count ?? 0) === 1 ? 'música' : 'músicas'}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
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
    headerRight: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    title: {
      ...typography.h2,
      color: colors.text,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
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
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      flexGrow: 1,
    },
    item: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    itemTitle: {
      ...typography.h3,
      color: colors.text,
      flex: 1,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
    },
    statusText: {
      ...typography.small,
      color: colors.primaryDark,
      fontWeight: '600',
    },
    itemMeta: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    itemLoc: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 4,
    },
    itemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    itemSongs: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
