import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song } from '../types';
import { Avatar } from '../components/Avatar';
import { spacing, radius, shadow } from '../constants/theme';
import { isBirthdayToday } from '../utils/dates';

/**
 * PERFIL = apresentação pública (somente visualização).
 * Edição fica em Configurações → Editar perfil / Dados pessoais.
 */
export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, church, membership, user, refreshProfile } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  // Local cover/avatar so we don't depend only on a stale context snapshot
  const [coverUri, setCoverUri] = useState<string | null>(profile?.cover_url ?? null);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [displayName, setDisplayName] = useState(profile?.name ?? 'Usuário');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // 1) Refresh auth context
        await refreshProfile?.();

        // 2) Direct fetch of profile images (source of truth for cover)
        const userId = user?.id ?? profile?.id;
        if (userId) {
          const { data: row, error } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, cover_url, birth_date')
            .eq('id', userId)
            .maybeSingle();
          if (__DEV__) {
            console.log('[Profile] cover_url from DB:', (row as any)?.cover_url, error?.message);
          }
          if (!cancelled && !error && row) {
            const nextCover = (row as any).cover_url ?? null;
            const nextAvatar = (row as any).avatar_url ?? null;
            setCoverUri(nextCover);
            setAvatarUri(nextAvatar);
            if (row.name) setDisplayName(row.name);
          }
        }

        if (!church) {
          setLoadingSongs(false);
          return;
        }
        setLoadingSongs(true);
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
      })();
      return () => {
        cancelled = true;
      };
    }, [church, refreshProfile, user?.id, profile?.id])
  );

  // Keep local state in sync if context updates while mounted
  React.useEffect(() => {
    if (profile?.cover_url) setCoverUri(profile.cover_url);
    if (profile?.avatar_url) setAvatarUri(profile.avatar_url);
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
        <View style={styles.coverWrap}>
          <View
            style={[
              styles.cover,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radius.xl,
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
                  { backgroundColor: colors.primary, opacity: 0.08 },
                ]}
              />
            )}
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={[styles.settingsFab, { top: insets.top + 8 }]}
          >
            <View style={[styles.fabCircle, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
              <Ionicons name="settings-outline" size={20} color="#111" />
            </View>
          </Pressable>
        </View>

        <View style={styles.avatarRow}>

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
          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
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
                {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Músicas que toca</Text>
          {loadingSongs ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : songs.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Nenhuma música adicionada ainda.
            </Text>
          ) : (
            songs.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => navigation.navigate('SongDetail', { songId: s.id })}
                style={({ pressed }) => [
                  styles.songRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.xl,
                    opacity: pressed ? 0.92 : 1,
                    ...shadow.sm,
                  },
                ]}
              >
                {s.artwork_url ? (
                  <Image source={{ uri: s.artwork_url }} style={styles.songCover} />
                ) : (
                  <View
                    style={[
                      styles.songCover,
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
                  <Text style={[styles.songKey, { color: colors.textSecondary }]}>
                    {s.key ? `Tonalidade: ${s.key}` : s.artist || '—'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  coverWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  cover: {
    height: 160,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  settingsFab: { position: 'absolute', right: 12, zIndex: 10 },
  fabCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRow: { alignItems: 'center', marginTop: -48 },
  avatarRing: { padding: 4, borderRadius: 56, borderWidth: 4 },
  identity: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  bday: { fontSize: 14, marginTop: 6 },
  metaRow: { flexDirection: 'row', gap: 20, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, fontWeight: '500' },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  empty: { fontSize: 14, marginTop: 4 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  songCover: { width: 48, height: 48, borderRadius: 10 },
  songInfo: { flex: 1, marginLeft: spacing.md },
  songTitle: { fontSize: 15, fontWeight: '600' },
  songKey: { fontSize: 13, marginTop: 2 },
});
