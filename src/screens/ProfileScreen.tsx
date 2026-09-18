import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DateField } from '../components/DateField';
import { InstrumentPicker } from '../components/InstrumentPicker';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import {
  parseInstruments,
  serializeInstruments,
} from '../constants/instruments';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';

export function ProfileScreen() {
  const {
    profile,
    church,
    membership,
    user,
    signOut,
    updateProfile,
    refreshMembership,
  } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [instruments, setInstruments] = useState<string[]>(() =>
    parseInstruments(membership?.instrument)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (profile?.name != null) setName(profile.name);
    if (profile?.birth_date != null) setBirthDate(profile.birth_date);
    else if (profile && profile.birth_date === null) setBirthDate('');
  }, [profile?.id, profile?.name, profile?.birth_date]);

  useEffect(() => {
    if (membership) setInstruments(parseInstruments(membership.instrument));
  }, [membership?.id, membership?.instrument]);

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
      const rawExt =
        asset.uri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
      const ext = rawExt === 'png' || rawExt === 'webp' ? rawExt : 'jpg';
      const contentType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
      const path = `${user.id}/avatar.${ext}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        Alert.alert('Erro', 'Não foi possível ler a imagem selecionada.');
        return;
      }

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType });

      if (upErr) {
        Alert.alert(
          'Erro no upload',
          formatSupabaseError(upErr) +
            '\n\nConfirme o bucket "avatars" (público) e policies no Supabase.'
        );
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error } = await updateProfile({ avatar_url: url });
      if (error) Alert.alert('Erro', error);
    } catch (e) {
      Alert.alert('Erro', (e as Error).message || 'Falha ao enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome.');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Sessão não carregada.');
      return;
    }

    setSaving(true);
    const { error: profileError } = await updateProfile({
      name: name.trim(),
      birth_date: birthDate && birthDate.trim() ? birthDate.trim() : null,
    } as any);

    if (profileError) {
      setSaving(false);
      Alert.alert('Erro ao salvar perfil', profileError);
      return;
    }

    if (membership?.id) {
      const { error: mErr } = await supabase
        .from('church_members')
        .update({ instrument: serializeInstruments(instruments) })
        .eq('id', membership.id)
        .eq('user_id', user.id);

      if (mErr) {
        setSaving(false);
        Alert.alert('Erro ao salvar instrumentos', formatSupabaseError(mErr));
        return;
      }
      await refreshMembership();
    }

    setSaving(false);
    Alert.alert('Sucesso', 'Perfil atualizado.');
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Erro', 'E-mail da conta não disponível.');
      return;
    }
    if (pwdNew.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      Alert.alert('Erro', 'A confirmação não confere com a nova senha.');
      return;
    }
    if (!pwdCurrent) {
      Alert.alert('Erro', 'Informe a senha atual.');
      return;
    }

    setPwdLoading(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwdCurrent,
    });
    if (signErr) {
      setPwdLoading(false);
      Alert.alert('Erro', 'Senha atual incorreta.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwdNew });
    setPwdLoading(false);
    if (error) {
      Alert.alert('Erro', formatSupabaseError(error));
      return;
    }
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    Alert.alert('Sucesso', 'Senha alterada com sucesso.');
  };

  const initial = (name || profile?.name || 'A').charAt(0).toUpperCase();

  const themeOptions: { key: 'system' | 'light' | 'dark'; label: string }[] = [
    { key: 'system', label: 'Sistema' },
    { key: 'light', label: 'Claro' },
    { key: 'dark', label: 'Escuro' },
  ];

  return (
    <TabScreenShell>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Perfil</Text>

        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <TouchableOpacity
            onPress={pickAvatar}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={12} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{name || profile?.name || '—'}</Text>
          <Text style={styles.displayMeta}>
            {roleLabel}
            {membership?.instrument
              ? ` · ${parseInstruments(membership.instrument).join(', ')}`
              : ''}
          </Text>
          <Text style={styles.changePhoto}>
            {uploading ? 'Enviando…' : 'Alterar foto'}
          </Text>
        </View>

        {/* Info cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.cardLabel}>E-mail</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.cardLabel}>Ministério</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {church?.name ?? '—'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.cardLabel}>Função</Text>
            <Text style={styles.cardValue}>{roleLabel}</Text>
          </View>
        </View>

        <Text style={styles.section}>Dados pessoais</Text>
        <Input
          label="Nome"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <DateField
          label="Data de nascimento"
          value={birthDate || ''}
          onChange={setBirthDate}
        />
        <InstrumentPicker selected={instruments} onChange={setInstruments} />
        <Button
          title="Salvar alterações"
          onPress={handleSave}
          loading={saving}
          style={styles.btn}
        />

        <Text style={styles.section}>Aparência</Text>
        <View style={styles.themeRow}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.themeChip,
                mode === opt.key && styles.themeChipOn,
              ]}
              onPress={() => setMode(opt.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.themeChipText,
                  mode === opt.key && styles.themeChipTextOn,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Segurança</Text>
        <View style={styles.securityBox}>
          <Input
            label="Senha atual"
            value={pwdCurrent}
            onChangeText={setPwdCurrent}
            secureTextEntry={!showPwd}
            placeholder="••••••••"
          />
          <Input
            label="Nova senha"
            value={pwdNew}
            onChangeText={setPwdNew}
            secureTextEntry={!showPwd}
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Confirmar nova senha"
            value={pwdConfirm}
            onChangeText={setPwdConfirm}
            secureTextEntry={!showPwd}
            placeholder="Repita a nova senha"
          />
          <TouchableOpacity
            onPress={() => setShowPwd((v) => !v)}
            style={styles.showPwd}
          >
            <Text style={styles.showPwdText}>
              {showPwd ? 'Ocultar senhas' : 'Mostrar senhas'}
            </Text>
          </TouchableOpacity>
          <Button
            title="Alterar senha"
            onPress={handleChangePassword}
            loading={pwdLoading}
            variant="secondary"
          />
        </View>

        <Button
          title="Sair da conta"
          onPress={() =>
            Alert.alert('Sair', 'Deseja sair da conta?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: signOut },
            ])
          }
          variant="danger"
          style={styles.btn}
        />
      </ScrollView>
    </TabScreenShell>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    pageTitle: {
      ...typography.h2,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    avatarBlock: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarFallback: {
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontSize: 34,
      fontWeight: '700',
      color: colors.primaryDark,
    },
    editBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    displayName: {
      ...typography.h3,
      color: colors.text,
      marginTop: spacing.md,
    },
    displayMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    changePhoto: {
      ...typography.caption,
      color: colors.primary,
      marginTop: spacing.sm,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    infoRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: spacing.md,
    },
    cardLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    cardValue: {
      ...typography.bodyMedium,
      color: colors.text,
      marginTop: 2,
    },
    section: {
      ...typography.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    btn: { marginTop: spacing.md },
    securityBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    showPwd: { marginBottom: spacing.sm },
    showPwdText: {
      ...typography.caption,
      color: colors.primary,
    },
    themeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    themeChipOn: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryMuted,
    },
    themeChipText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    themeChipTextOn: {
      color: colors.primaryDark,
      fontWeight: '600',
    },
  });
}
