import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { ChurchMember, UserRole, INSTRUMENT_SUGGESTIONS } from '../types';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';

export function TeamScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { church, membership, user } = useAuth();
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInstrument, setEditInstrument] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('musician');

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';
  const isOwner = membership?.role === 'owner';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('church_members')
      .select('*, profile:profiles(*)')
      .eq('church_id', church.id)
      .order('created_at');
    if (error) {
      setMembers([]);
      Alert.alert('Erro ao carregar equipe', formatSupabaseError(error));
    } else {
      setMembers((data as ChurchMember[]) ?? []);
    }
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const roleLabel = (r: string) => {
    if (r === 'owner') return 'Admin';
    if (r === 'leader') return 'Líder';
    return 'Músico';
  };

  const startEdit = (m: ChurchMember) => {
    if (!canManage || m.role === 'owner') return;
    setEditingId(m.id);
    setEditInstrument(m.instrument ?? '');
    setEditRole(m.role === 'leader' ? 'leader' : 'musician');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('church_members')
      .update({
        instrument: editInstrument.trim() || null,
        role: editRole,
      })
      .eq('id', editingId);
    if (error) Alert.alert('Erro', formatSupabaseError(error));
    else {
      setEditingId(null);
      load();
    }
  };

  const removeMember = (m: ChurchMember) => {
    if (m.user_id === user?.id) {
      Alert.alert('Aviso', 'Não é possível remover a si mesmo por aqui.');
      return;
    }
    if (m.role === 'owner') {
      Alert.alert('Aviso', 'Não é possível remover o administrador.');
      return;
    }
    Alert.alert('Remover membro', `Remover ${m.profile?.name ?? 'membro'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('church_members')
            .delete()
            .eq('id', m.id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Equipe" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Equipe" />

      {church?.invite_code ? (
        <View style={styles.inviteBanner}>
          <Ionicons name="key-outline" size={16} color={colors.primary} />
          <Text style={styles.code}>
            Código de convite:{' '}
            <Text style={styles.codeValue}>{church.invite_code}</Text>
          </Text>
        </View>
      ) : null}

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Equipe vazia"
            description="Compartilhe o código de convite para adicionar integrantes."
          />
        }
        renderItem={({ item }) => {
          const isEditing = editingId === item.id;
          return (
            <View style={styles.item}>
              {isEditing ? (
                <View>
                  <Text style={styles.name}>
                    {item.profile?.name ?? 'Usuário'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={editInstrument}
                    onChangeText={setEditInstrument}
                    placeholder="Instrumento / função"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.roleRow}>
                    {INSTRUMENT_SUGGESTIONS.slice(0, 8).map((inst) => (
                      <TouchableOpacity
                        key={inst}
                        style={[
                          styles.roleChip,
                          editInstrument === inst && styles.roleChipOn,
                        ]}
                        onPress={() => setEditInstrument(inst)}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            editInstrument === inst && styles.roleChipTextOn,
                          ]}
                        >
                          {inst}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {isOwner && (
                    <View style={styles.roleRow}>
                      <TouchableOpacity
                        style={[
                          styles.roleChip,
                          editRole === 'musician' && styles.roleChipOn,
                        ]}
                        onPress={() => setEditRole('musician')}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            editRole === 'musician' && styles.roleChipTextOn,
                          ]}
                        >
                          Músico
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleChip,
                          editRole === 'leader' && styles.roleChipOn,
                        ]}
                        onPress={() => setEditRole('leader')}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            editRole === 'leader' && styles.roleChipTextOn,
                          ]}
                        >
                          Líder
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.editActions}>
                    <Button
                      title="Salvar"
                      onPress={saveEdit}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Cancelar"
                      onPress={() => setEditingId(null)}
                      variant="ghost"
                      style={{ flex: 1 }}
                    />
                  </View>
                  {canManage && item.role !== 'owner' ? (
                    <TouchableOpacity
                      onPress={() => removeMember(item)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>Remover da equipe</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('MemberDetail', { memberId: item.id })
                  }
                  onLongPress={
                    canManage ? () => startEdit(item) : undefined
                  }
                  activeOpacity={0.7}
                >
                  <Avatar
                    uri={item.profile?.avatar_url}
                    name={item.profile?.name}
                    size={44}
                  />
                  <View style={styles.rowInfo}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.profile?.name ?? 'Usuário'}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[item.instrument || 'Sem instrumento', roleLabel(item.role)].join(
                        ' · '
                      )}
                    </Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {roleLabel(item.role)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
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
    inviteBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.primaryLight,
      borderRadius: radius.md,
    },
    code: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
    },
    codeValue: {
      fontWeight: '700',
      color: colors.primaryDark,
      letterSpacing: 0.5,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.sm,
    },
    item: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowInfo: { flex: 1, minWidth: 0 },
    name: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceSecondary,
    },
    roleBadgeText: {
      ...typography.small,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      marginTop: spacing.sm,
      ...typography.body,
      color: colors.text,
      backgroundColor: colors.background,
    },
    roleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    roleChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    roleChipOn: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryMuted,
    },
    roleChipText: {
      ...typography.caption,
      color: colors.text,
    },
    roleChipTextOn: {
      color: colors.primaryDark,
      fontWeight: '600',
    },
    editActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    removeBtn: {
      marginTop: spacing.md,
      alignItems: 'center',
    },
    removeText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
