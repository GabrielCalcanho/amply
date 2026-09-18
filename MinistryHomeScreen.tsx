import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { TabScreenShell } from '../../components/layout/TabScreenShell';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { formatSupabaseError } from '../../utils/payload';

export function MinistryHomeScreen() {
  const navigation = useNavigation<any>();
  const { church, membership, updateChurch } = useAuth();
  const [counts, setCounts] = useState({
    teams: 0,
    roles: 0,
    classifications: 0,
    members: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [t, r, c, m] = await Promise.all([
      supabase
        .from('ministry_teams')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', church.id),
      supabase
        .from('ministry_roles')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', church.id),
      supabase
        .from('member_classifications')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', church.id),
      supabase
        .from('church_members')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', church.id),
    ]);
    setCounts({
      teams: t.error ? 0 : t.count ?? 0,
      roles: r.error ? 0 : r.count ?? 0,
      classifications: c.error ? 0 : c.count ?? 0,
      members: m.error ? 0 : m.count ?? 0,
    });
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickCover = async () => {
    if (!church || !canManage) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso à galeria para alterar a capa.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const uri = asset.uri;
      const extGuess = uri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
      const ext = ['png', 'webp', 'jpg', 'jpeg'].includes(extGuess)
        ? extGuess === 'jpeg'
          ? 'jpg'
          : extGuess
        : 'jpg';
      const contentType =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      // Path: churches/{churchId}/logo.{ext} inside bucket "avatars"
      const path = `churches/${church.id}/logo.${ext}`;

      // React Native: fetch local URI → ArrayBuffer (more reliable than Blob)
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Não foi possível ler a imagem selecionada.');
      }
      const arrayBuffer = await response.arrayBuffer();

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, {
          upsert: true,
          contentType,
        });

      if (upErr) {
        Alert.alert(
          'Erro no upload',
          formatSupabaseError(upErr) +
            '\n\nConfirme o bucket "avatars" e as policies que permitem upload em churches/{churchId}/.'
        );
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;

      const { error } = await updateChurch({ logo_url: url });
      if (error) {
        Alert.alert('Erro', error);
        return;
      }
    } catch (e) {
      Alert.alert('Erro', (e as Error).message || 'Falha ao processar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const sections = [
    { key: 'Teams', label: 'Equipes', count: counts.teams, icon: 'people-outline' as const },
    { key: 'Roles', label: 'Funções', count: counts.roles, icon: 'musical-note-outline' as const },
    {
      key: 'Classifications',
      label: 'Classificações',
      count: counts.classifications,
      icon: 'pricetag-outline' as const,
    },
    { key: 'Team', label: 'Membros', count: counts.members, icon: 'person-outline' as const },
  ];

  return (
    <TabScreenShell>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity
          style={styles.cover}
          onPress={canManage ? pickCover : undefined}
          activeOpacity={canManage ? 0.85 : 1}
          disabled={uploading}
        >
          {church?.logo_url ? (
            <Image source={{ uri: church.logo_url }} style={styles.coverImage} resizeMode="cover" />
          ) : null}
          <View style={styles.coverOverlay}>
            <Text style={styles.coverLabel}>Ministério</Text>
            <Text style={styles.coverName}>{church?.name ?? '—'}</Text>
            {church?.invite_code ? (
              <Text style={styles.invite}>Convite: {church.invite_code}</Text>
            ) : null}
            {canManage ? (
              <View style={styles.coverAction}>
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={styles.coverActionText}>
                      {church?.logo_url ? 'Alterar capa' : 'Adicionar capa'}
                    </Text>
                  </>
                )}
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.grid}>
            {sections.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.tile}
                onPress={() => navigation.navigate(s.key)}
              >
                <Ionicons name={s.icon} size={22} color={colors.primary} />
                <Text style={styles.tileLabel}>{s.label}</Text>
                <Text style={styles.tileCount}>{s.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: colors.primary,
    minHeight: 160,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  coverLabel: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },
  coverName: { ...typography.h1, color: colors.white, marginTop: 4 },
  invite: { ...typography.caption, color: 'rgba(255,255,255,0.9)', marginTop: spacing.sm },
  coverAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  coverActionText: { ...typography.caption, color: '#fff', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.sm },
  tile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  tileLabel: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.sm },
  tileCount: { ...typography.h2, color: colors.primary, marginTop: 4 },
});
