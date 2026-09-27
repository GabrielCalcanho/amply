import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { Input } from '../../components/Input';
import { DateField } from '../../components/DateField';
import { Button } from '../../components/Button';
import { uploadProfileImage, ImageKind } from '../../utils/imageUpload';
import { spacing, radius, shadow } from '../../constants/theme';
import { formatSupabaseError } from '../../utils/payload';

export function EditProfileScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile, membership, user, updateProfile, refreshMembership, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [instrument, setInstrument] = useState(membership?.instrument ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const avatarUri = avatarPreview || profile?.avatar_url || null;
  const coverUri = coverPreview || profile?.cover_url || null;

  const roleLabel =
    membership?.role === 'owner'
      ? 'Administrador'
      : membership?.role === 'leader'
        ? 'Líder'
        : 'Músico';

  const uploadImage = async (kind: ImageKind) => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (kind === 'avatar') {
      setAvatarPreview(asset.uri);
      setUploadingAvatar(true);
    } else {
      setCoverPreview(asset.uri);
      setUploadingCover(true);
    }

    try {
      const up = await uploadProfileImage({
        userId: user.id,
        kind,
        uri: asset.uri,
        mimeType: (asset as any).mimeType || null,
        base64: (asset as any).base64 || null,
      });
      if ('error' in up) {
        Alert.alert('Erro no upload', up.error);
        if (kind === 'avatar') setAvatarPreview(null);
        else setCoverPreview(null);
        return;
      }
      const patch =
        kind === 'avatar' ? { avatar_url: up.publicUrl } : { cover_url: up.publicUrl };
      const { error } = await updateProfile(patch as any);
      if (error) {
        Alert.alert('Erro ao salvar', error);
        if (kind === 'avatar') setAvatarPreview(null);
        else setCoverPreview(null);
        return;
      }
      if (kind === 'avatar') setAvatarPreview(up.publicUrl);
      else setCoverPreview(up.publicUrl);
      toast.success(kind === 'avatar' ? 'Foto atualizada' : 'Capa atualizada');
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
        const next = instrument.trim() || null;
        if (next !== (membership.instrument ?? null)) {
          const { error: mErr } = await supabase
            .from('church_members')
            .update({ instrument: next })
            .eq('id', membership.id);
          if (mErr) {
            Alert.alert('Erro', formatSupabaseError(mErr));
            return;
          }
          await refreshMembership();
        }
      }
      await refreshProfile?.();
      toast.success('Perfil atualizado');
    } catch (e) {
      Alert.alert('Erro', formatSupabaseError(e as { message?: string }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Editar perfil" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Foto de capa</Text>
        <Pressable
          onPress={() => uploadImage('cover')}
          disabled={uploadingCover}
          style={[
            styles.coverBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radius.xl,
            },
          ]}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImg} />
          ) : (
            <View style={styles.coverEmpty}>
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
                Sem capa
              </Text>
            </View>
          )}
          {uploadingCover ? (
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
        </Pressable>
        <Pressable onPress={() => uploadImage('cover')} style={styles.linkBtn}>
          <Text style={[styles.linkText, { color: colors.text }]}>
            {uploadingCover ? 'Enviando capa…' : 'Alterar foto de capa'}
          </Text>
        </Pressable>

        <Text
          style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}
        >
          Foto de perfil
        </Text>
        <Pressable
          onPress={() => uploadImage('avatar')}
          disabled={uploadingAvatar}
          style={styles.avatarWrap}
        >
          {uploadingAvatar ? (
            <View
              style={[styles.avatarLoading, { backgroundColor: colors.surfaceSecondary }]}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Avatar uri={avatarUri} name={profile?.name} size={96} />
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
          label="Instrumento"
          value={instrument}
          onChangeText={setInstrument}
          placeholder="Ex: Vocal, Violão..."
        />
        <DateField label="Data de nascimento" value={birthDate} onChange={setBirthDate} />

        <View
          style={[
            styles.readOnlyCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.xl,
            },
          ]}
        >
          <View style={[styles.readOnlyRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.readLabel, { color: colors.textMuted }]}>Função</Text>
            <Text style={[styles.readValue, { color: colors.text }]}>{roleLabel}</Text>
          </View>
          <View style={[styles.readOnlyRow, styles.readOnlyRowLast]}>
            <Text style={[styles.readLabel, { color: colors.textMuted }]}>Email</Text>
            <Text
              style={[styles.readValue, { color: colors.text }]}
              numberOfLines={1}
            >
              {user?.email ?? '—'}
            </Text>
          </View>
        </View>

        <Button
          title="Salvar alterações"
          onPress={save}
          loading={saving}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  coverBox: {
    height: 120,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverImg: { width: '100%', height: '100%' },
  coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  linkText: { fontSize: 14, fontWeight: '600' },
  avatarWrap: { alignItems: 'center' },
  avatarLoading: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  readOnlyRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  readOnlyRowLast: {
    borderBottomWidth: 0,
  },
  readLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  readValue: { fontSize: 15, fontWeight: '500' },
});
