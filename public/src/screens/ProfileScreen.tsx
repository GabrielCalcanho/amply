import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DateField } from '../components/DateField';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { formatSupabaseError } from '../utils/payload';
import { formatDateBR } from '../utils/dates';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile, church, membership, user, signOut, updateProfile, refreshMembership } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [instrument, setInstrument] = useState(membership?.instrument ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const roleLabel =
    membership?.role === 'owner'
      ? 'Administrador'
      : membership?.role === 'leader'
      ? 'Líder'
      : 'Músico';

  const pickAvatar = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso à galeria para alterar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext === 'png' ? 'png' : 'jpg'}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });

      if (upErr) {
        Alert.alert(
          'Erro no upload',
          formatSupabaseError(upErr) +
            '\n\nCrie o bucket "avatars" (público) no Supabase Storage se ainda não existir.'
        );
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl + `?t=${Date.now()}`;
      const { error } = await updateProfile({ avatar_url: url });
      if (error) Alert.alert('Erro', error);
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    Alert.alert('Remover foto', 'Deseja remover a foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await updateProfile({ avatar_url: null });
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome.');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      name: name.trim(),
      birth_date: birthDate || null,
    } as any);

    if (membership && user) {
      const { error: mErr } = await supabase
        .from('church_members')
        .update({ instrument: instrument.trim() || null })
        .eq('id', membership.id);
      if (mErr) {
        setSaving(false);
        Alert.alert('Erro', formatSupabaseError(mErr));
        return;
      }
      await refreshMembership();
    }

    setSaving(false);
    if (error) Alert.alert('Erro', error);
    else Alert.alert('Sucesso', 'Perfil atualizado.');
  };

  const handleSignOut = () => {
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Perfil" />
      <Pressable
        onPress={() =>
          navigation.navigate('MemberDetail', {
            userId: user?.id,
            memberId: membership?.id,
          })
        }
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
          paddingVertical: 12,
          alignItems: 'center',
          borderRadius: 12,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
          Ver perfil público
        </Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.container}>

        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>
                {(profile?.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.changePhoto}>Alterar foto</Text>
        </TouchableOpacity>
        {profile?.avatar_url ? (
          <TouchableOpacity onPress={removeAvatar}>
            <Text style={styles.removePhoto}>Remover foto</Text>
          </TouchableOpacity>
        ) : null}

        <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <DateField label="Data de nascimento" value={birthDate || ''} onChange={setBirthDate} />
        <Input
          label="Instrumento"
          value={instrument}
          onChangeText={setInstrument}
          placeholder="Ex: Violão, Bateria"
        />

        <View style={styles.card}>
          <Text style={styles.label}>Ministério</Text>
          <Text style={styles.value}>{church?.name ?? '—'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Função</Text>
          <Text style={styles.value}>{roleLabel}</Text>
        </View>
        {church?.invite_code ? (
          <View style={styles.card}>
            <Text style={styles.label}>Código de convite</Text>
            <Text style={styles.value}>{church.invite_code}</Text>
          </View>
        ) : null}
        {profile?.birth_date ? (
          <View style={styles.card}>
            <Text style={styles.label}>Aniversário</Text>
            <Text style={styles.value}>{formatDateBR(profile.birth_date)}</Text>
          </View>
        ) : null}

        <Button title="Salvar" onPress={handleSave} loading={saving} style={styles.btn} />
        <Button title="Sair" onPress={handleSignOut} variant="danger" style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { ...typography.h1, color: colors.primary },
  changePhoto: { ...typography.caption, color: colors.primary, marginTop: spacing.sm },
  removePhoto: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
  btn: { marginTop: spacing.md },
});
