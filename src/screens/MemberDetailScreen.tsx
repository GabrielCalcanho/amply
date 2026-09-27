import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChurchMember, Profile, Song } from '../types';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { spacing, radius } from '../constants/theme';
import { isBirthdayToday } from '../utils/dates';
import { formatSupabaseError } from '../utils/payload';

type MemberRow = ChurchMember & { profile?: Profile | null };

export function MemberDetailScreen() {
  const { colors } = useTheme();
  const { church, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const memberId = route.params?.memberId as string | undefined;
  const userIdParam = route.params?.userId as string | undefined;

  const [member, setMember] = useState<MemberRow | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let row: MemberRow | null = null;

      if (memberId) {
        const { data } = await supabase
          .from('church_members')
          .select('*, profile:profiles(*)')
          .eq('id', memberId)
          .maybeSingle();
        row = (data as MemberRow) ?? null;
      }

      if (!row && userIdParam && church) {
        const { data } = await supabase
          .from('church_members')
          .select('*, profile:profiles(*)')
          .eq('church_id', church.id)
          .eq('user_id', userIdParam)
          .maybeSingle();
        row = (data as MemberRow) ?? null;
      }

      // Fallback: only profile
      if (!row && userIdParam) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userIdParam)
          .maybeSingle();
        if (prof) {
          row = {
            id: '',
            church_id: church?.id ?? '',
            user_id: userIdParam,
            role: 'musician',
            instrument: null,
            created_at: '',
            profile: prof as Profile,
          };
        }
      }

      setMember(row);

      // Songs of the church as a simple "musicas que toca" list
      // Prefer favorites / recent if available
      if (church) {
        const { data: songData } = await supabase
          .from('songs')
          .select('*')
          .eq('church_id', church.id)
          .order('is_favorite', { ascending: false })
          .order('title')
          .limit(12);
        setSongs((songData as Song[]) ?? []);
      } else {
        setSongs([]);
      }
    } catch (e) {
      console.warn('MemberDetail load', e);
      setMember(null);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [memberId, userIdParam, church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Voltar"
          style={[styles.backFab, { top: insets.top + 8 }]}
        >
          <View
            style={[
              styles.backCircle,
              {
                backgroundColor: colors.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </View>
        </Pressable>
        <EmptyState
          icon="person-outline"
          title="Membro não encontrado"
          description="Não foi possível carregar os dados deste integrante."
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const p = member.profile;
  const name = p?.name ?? 'Integrante';
  const birthdayToday = p?.birth_date ? isBirthdayToday(p.birth_date) : false;
  const instrument = member.instrument || '—';
  const coverUri: string | null = (p as any)?.cover_url ?? null;
  const isSelf = member.user_id === user?.id;

  const openChat = async () => {
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
      p_other_user: member.user_id,
    });
    if (error || !data) {
      Alert.alert('Erro', error ? formatSupabaseError(error) : 'Não foi possível abrir a conversa.');
      return;
    }
    navigation.navigate('Chat', { conversationId: data as string, title: name });
  };


  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl + 24 }}
      >
        {/* Cover */}
        <View style={[styles.cover, { backgroundColor: colors.surfaceSecondary }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.primary, opacity: 0.08 },
              ]}
            />
          )}
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityLabel="Voltar"
            style={[styles.backFab, { top: insets.top + 8 }]}
          >
            <View
              style={[
                styles.backCircle,
                {
                  backgroundColor: colors.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </View>
          </Pressable>
          {!isSelf ? (
            <Pressable
              onPress={openChat}
              hitSlop={12}
              style={[styles.chatFab, { top: insets.top + 8 }]}
              accessibilityLabel="Conversar"
            >
              <View
                style={[
                  styles.backCircle,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
              </View>
            </Pressable>
          ) : null}
        </View>

        {/* Avatar overlapping cover */}
        <View style={styles.avatarRow}>
          <View
            style={[
              styles.avatarRing,
              {
                backgroundColor: colors.background,
                borderColor: colors.background,
              },
            ]}
          >
            <Avatar uri={p?.avatar_url} name={name} size={96} />
          </View>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          {birthdayToday ? (
            <Text style={[styles.bday, { color: colors.textSecondary }]}>
              Hoje é o aniversário!
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {instrument}
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

        {/* Songs section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Repertório do ministério
          </Text>
          {songs.length === 0 ? (
            <Text style={[styles.emptySongs, { color: colors.textMuted }]}>
              Nenhuma música no repertório ainda.
            </Text>
          ) : (
            <View
              style={[
                styles.songList,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              {songs.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => navigation.navigate('SongDetail', { songId: s.id })}
                  style={({ pressed }) => [
                    styles.songRow,
                    {
                      backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                      borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: colors.border,
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
                    <Text
                      style={[styles.songKey, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: {
    height: 160,
    width: '100%',
  },
  backFab: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  chatFab: {
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  backCircle: {
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
  emptySongs: {
    fontSize: 14,
    marginTop: 4,
  },
  songList: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  songCover: {
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
  footer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
});
