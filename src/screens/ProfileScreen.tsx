import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song } from '../types';
import { Avatar } from '../components/Avatar';
import { spacing, radius } from '../constants/theme';
import { isBirthdayToday } from '../utils/dates';

const SCREEN_W = Dimensions.get('window').width;
const COVER_H = 180;

/**
 * PERFIL = apresentação pública (somente visualização).
 */
export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, church, membership, user, refreshProfile } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [coverUri, setCoverUri] = useState<string | null>(profile?.cover_url ?? null);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [displayName, setDisplayName] = useState(profile?.name ?? 'Usuário');

  // Prevent infinite focus loops
  const loadingRef = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      let cancelled = false;

      (async () => {
        try {
          const userId = user?.id ?? profile?.id ?? null;

          // Refresh context once (no await chain that retriggers focus)
          if (refreshProfile) {
            await refreshProfile();
          }

          if (userId && !cancelled) {
            const { data: row } = await supabase
              .from('profiles')
              .select('id, name, avatar_url, cover_url, birth_date')
              .eq('id', userId)
              .maybeSingle();

            if (row && !cancelled) {
              setCoverUri((row as any).cover_url ?? null);
              setAvatarUri((row as any).avatar_url ?? null);
              if (row.name) setDisplayName(row.name);
            }
            lastUserId.current = userId;
          }

          if (!church?.id) {
            if (!cancelled) setLoadingSongs(false);
            return;
          }

          if (!cancelled) setLoadingSongs(true);
          const { data } = await supabase
            .from('songs')
            .select('*')
            .eq('church_id', church.id)
            .order('is_favorite', { ascending: false })
            .order('title')
            .limit(12);

          if (!cancelled) {
            setSongs((data as Song[]) ?? []);
            setLoadingSongs(false);
          }
        } finally {
          // allow next focus after this run finishes
          setTimeout(() => {
            loadingRef.current = false;
          }, 400);
        }
      })();

      return () => {
        cancelled = true;
      };
      // Only depend on stable ids — NOT refreshProfile function identity
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, profile?.id, church?.id])
  );

  // Sync from context when profile fields change (e.g. after edit) — no loop
  useEffect(() => {
    if (profile?.cover_url != null) setCoverUri(profile.cover_url);
    if (profile?.avatar_url != null) setAvatarUri(profile.avatar_url);
    if (profile?.name) setDisplayName(profile.name);
  }, [profile?.cover_url, profile?.avatar_url, profile?.name]);

  const instrumentLabel = membership?.instrument || '—';
  const birthdayToday = profile?.birth_date ? isBirthdayToday(profile.birth_date) : false;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl + 24 }}
      >
        {/*
          Capa full-bleed no topo (100% largura).
          Cantos superiores arredondados como card.
          Respeita safe area visual via paddingTop no conteúdo abaixo;
          a imagem começa no topo da tela de conteúdo da tab.
        */}
        <View style={styles.coverWrap}>
          <View
            style={[
              styles.cover,
              {
                backgroundColor: colors.surfaceSecondary,
                // cantos de cima arredondados (card)
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                overflow: 'hidden',
              },
            ]}
          >
            {coverUri ? (
              <Image
                key={coverUri}
                source={{ uri: coverUri }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.coverImage,
                  { backgroundColor: colors.primary, opacity: 0.1 },
                ]}
              />
            )}
          </View>

          <Pressable
            onPress={() => navigation.canGoBack() && navigation.goBack()}
            hitSlop={12}
            style={[styles.backFab, { top: Math.max(insets.top, 12) }]}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <View
              style={[
                styles.fabCircle,
                {
                  backgroundColor: colors.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={[styles.settingsFab, { top: Math.max(insets.top, 12) }]}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
          >
            <View
              style={[
                styles.fabCircle,
                {
                  backgroundColor: colors.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </View>
          </Pressable>
        </View>

        {/* Avatar sobreposto à capa */}
        <View style={styles.avatarRow}>
          <View
            style={[
              styles.avatarRing,
              { backgroundColor: colors.background, borderColor: colors.background },
            ]}
          >
            <Avatar uri={avatarUri} name={displayName} size={96} />
          </View>
        </View>

        <View style={styles.identity}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {displayName}
          </Text>
          {birthdayToday ? (
            <Text style={[styles.bday, { color: colors.textSecondary }]}>
              Hoje é o seu aniversário!
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {instrumentLabel}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="musical-notes-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {songs.length >= 12 ? '12+' : songs.length} {songs.length === 1 ? 'música' : 'músicas'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Repertório do ministério</Text>
          {loadingSongs ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : songs.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Nenhuma música adicionada ainda.
            </Text>
          ) : (
            <View
              style={[
                styles.songList,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {songs.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => navigation.navigate('SongDetail', { songId: s.id })}
                  accessibilityRole="button"
                  accessibilityLabel={s.title}
                  style={({ pressed }) => [
                    styles.songRow,
                    i < songs.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                    pressed && { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  {s.artwork_url ? (
                    <Image source={{ uri: s.artwork_url }} style={styles.songCoverImg} />
                  ) : (
                    <View
                      style={[
                        styles.songCoverImg,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Ionicons name="musical-note" size={18} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.songInfo}>
                    <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={[styles.songKey, { color: colors.textSecondary }]} numberOfLines={1}>
                      {s.key ? `Tonalidade: ${s.key}` : s.artist || '—'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // Full width — cola nas laterais da tela
  coverWrap: {
    width: SCREEN_W,
    marginLeft: 0,
    marginRight: 0,
  },
  cover: {
    width: SCREEN_W,
    height: COVER_H,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  settingsFab: {
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  backFab: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  fabCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRow: {
    alignItems: 'center',
    marginTop: -48,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 56,
    borderWidth: 4,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  bday: {
    fontSize: 14,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: 14,
    marginTop: 4,
  },
  songList: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  songCoverImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  songInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  songKey: {
    fontSize: 13,
    marginTop: 2,
  },
});
