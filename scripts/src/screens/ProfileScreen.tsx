import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Song } from '../types';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DateField } from '../components/DateField';
import { spacing, radius, shadow } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';
import { isBirthdayToday } from '../utils/dates';
import { uploadProfileImage } from '../utils/imageUpload';

type ImageKind = 'avatar' | 'cover';

/**
 * PERFIL = próprio usuário (visual + editar de verdade).
 * EQUIPE → MemberDetail = só visualização.
 */
export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    profile,
    church,
    membership,
    user,
    updateProfile,
    refreshMembership,
  } = useAuth();

  const [editing, setEditing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [instrument, setInstrument] = useState(membership?.instrument ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Local preview URLs after pick (before/after upload)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Open edit mode when navigated from Settings → Dados pessoais
  useFocusEffect(
    useCallback(() => {
      if (route.params?.openEdit) {
        setEditing(true);
        // clear param so back doesn't re-open edit forever
        navigation.setParams?.({ openEdit: undefined });
      }
    }, [route.params?.openEdit, navigation])
  );

  useFocusEffect(
    useCallback(() => {
      setName(profile?.name ?? '');
      setBirthDate(profile?.birth_date ?? '');
      setInstrument(membership?.instrument ?? '');
      setAvatarPreview(null);
      setCoverPreview(null);
      // stay on edit if user was editing? prefer reset to view
      // setEditing(false);

      let cancelled = false;
      (async () => {
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
    }, [profile?.name, profile?.birth_date, profile?.avatar_url, profile?.cover_url, membership?.instrument, church])
  );

  const uploadImage = async (kind: ImageKind) => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso à galeria para alterar a imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (kind === 'avatar') setAvatarPreview(asset.uri);
    else setCoverPreview(asset.uri);

    if (kind === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const mime =
        (asset as any).mimeType ||
        (asset as any).type ||
        null;

      const resultUp = await uploadProfileImage({
        userId: user.id,
        kind,
        uri: asset.uri,
        mimeType: mime,
      });

      if ('error' in resultUp) {
        Alert.alert('Erro no upload', resultUp.error);
        if (kind === 'avatar') setAvatarPreview(null);
        else setCoverPreview(null);
        return;
      }

      const patch =
        kind === 'avatar'
          ? { avatar_url: resultUp.publicUrl }
          : { cover_url: resultUp.publicUrl };

      const { error } = await updateProfile(patch as any);
      if (error) {
        Alert.alert('Erro ao salvar no perfil', error);
        if (kind === 'avatar') setAvatarPreview(null);
        else setCoverPreview(null);
        return;
      }

      if (kind === 'avatar') setAvatarPreview(resultUp.publicUrl);
      else setCoverPreview(resultUp.publicUrl);
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
      if (kind === 'avatar') setAvatarPreview(null);
      else setCoverPreview(null);
    } finally {
      if (kind === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await updateProfile({
        name: name.trim(),
        birth_date: birthDate || null,
      });
      if (error) {
        Alert.alert('Erro', error);
        return;
      }
      if (membership?.id) {
        const nextInst = instrument.trim() || null;
        if (nextInst !== (membership.instrument ?? null)) {
          const { error: mErr } = await supabase
            .from('church_members')
            .update({ instrument: nextInst })
            .eq('id', membership.id);
          if (mErr) {
            Alert.alert('Erro', formatSupabaseError(mErr));
            return;
          }
          await refreshMembership();
        }
      }
      setEditing(false);
      Alert.alert('Salvo', 'Perfil atualizado com sucesso.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name ?? 'Usuário';
  const instrumentLabel = membership?.instrument || '—';
  const birthdayToday = profile?.birth_date ? isBirthdayToday(profile.birth_date) : false;

  const avatarUri = avatarPreview || profile?.avatar_url || null;
  const coverUri = coverPreview || profile?.cover_url || null;

  // ——— Edit mode ———
  if (editing) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.editHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => {
              setEditing(false);
              setAvatarPreview(null);
              setCoverPreview(null);
            }}
            hitSlop={12}
            style={styles.editBack}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.editTitle, { color: colors.text }]}>Editar perfil</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.editContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cover */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Foto de capa
          </Text>
          <Pressable
            onPress={() => uploadImage('cover')}
            disabled={uploadingCover}
            style={({ pressed }) => [
              styles.coverEdit,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverEditImg} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
                  Sem capa
                </Text>
              </View>
            )}
            {uploadingCover ? (
              <View style={styles.coverOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => uploadImage('cover')} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.text }]}>
              {uploadingCover ? 'Enviando capa…' : 'Alterar foto de capa'}
            </Text>
          </Pressable>

          {/* Avatar */}
          <Text
            style={[
              styles.fieldLabel,
              { color: colors.textSecondary, marginTop: spacing.lg },
            ]}
          >
            Foto de perfil
          </Text>
          <Pressable
            onPress={() => uploadImage('avatar')}
            disabled={uploadingAvatar}
            style={styles.avatarEditWrap}
          >
            {uploadingAvatar ? (
              <View
                style={[
                  styles.avatarLoading,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <Avatar uri={avatarUri} name={displayName} size={96} />
            )}
          </Pressable>
          <Pressable onPress={() => uploadImage('avatar')} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.text }]}>
              {uploadingAvatar ? 'Enviando foto…' : 'Alterar foto'}
            </Text>
          </Pressable>

          <View style={{ height: spacing.md }} />

          <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          <Input
            label="Instrumento / função"
            value={instrument}
            onChangeText={setInstrument}
            placeholder="Ex: Vocal, Violão..."
          />
          <DateField
            label="Data de nascimento"
            value={birthDate}
            onChange={setBirthDate}
          />

          <Button
            title="Salvar alterações"
            onPress={save}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
          <Button
            title="Cancelar"
            onPress={() => {
              setEditing(false);
              setAvatarPreview(null);
              setCoverPreview(null);
            }}
            variant="ghost"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </View>
    );
  }

  // ——— View mode ———
  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl + 24 }}
      >
        {/* Cover */}
        <View style={[styles.cover, { backgroundColor: colors.surfaceSecondary }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFillObject} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: colors.primary, opacity: 0.08 },
              ]}
            />
          )}
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

        {/* Avatar */}
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
                    borderRadius: radius.lg,
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

        <View style={styles.footer}>
          <Button title="Editar perfil" onPress={() => setEditing(true)} fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cover: { height: 160, width: '100%' },
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
  footer: { paddingHorizontal: spacing.md, marginTop: spacing.xl },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  editBack: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  editTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  editContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  coverEdit: {
    height: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverEditImg: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarEditWrap: {
    alignItems: 'center',
  },
  avatarLoading: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
