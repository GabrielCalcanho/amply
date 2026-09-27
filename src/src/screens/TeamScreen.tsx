import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { ChurchMember, UserRole, INSTRUMENT_SUGGESTIONS } from '../types';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { AppHeader } from '../components/layout/AppHeader';
import { Avatar } from '../components/Avatar';
import { SearchField } from '../components/SearchField';
import { SegmentedControl } from '../components/SegmentedControl';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { spacing, radius, shadow } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';

type FilterKey = 'members' | 'roles' | 'instruments';

export function TeamScreen() {
  const navigation = useNavigation<any>();
  const { church, membership, user } = useAuth();
  const { colors } = useTheme();
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('members');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInstrument, setEditInstrument] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('musician');

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data } = await supabase
      .from('church_members')
      .select('*, profile:profiles(*)')
      .eq('church_id', church.id)
      .order('created_at');
    setMembers((data as ChurchMember[]) ?? []);
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
      .update({ instrument: editInstrument.trim() || null, role: editRole })
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
          const { error } = await supabase.from('church_members').delete().eq('id', m.id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else load();
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    let list = members;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (m) =>
          (m.profile?.name ?? '').toLowerCase().includes(q) ||
          (m.instrument ?? '').toLowerCase().includes(q) ||
          roleLabel(m.role).toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, search]);

  const invite = () => {
    if (!church?.invite_code) return;
    Alert.alert(
      'Convidar membro',
      `Compartilhe o código de convite:\n\n${church.invite_code}\n\nO novo membro usa este código ao criar a conta ou em Configurações.`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <TabScreenShell>
        <AppHeader title="Equipe" showNotifications={false} showAvatar={false} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </TabScreenShell>
    );
  }

  return (
    <TabScreenShell>
      <AppHeader
        title="Equipe"
        showNotifications={false}
        showAvatar={false}
        right={
          canManage ? (
            <Pressable
              onPress={invite}
              hitSlop={10}
              style={({ pressed }) => [
                styles.inviteBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={18} color={colors.textInverse} />
              <Text style={[styles.inviteText, { color: colors.textInverse }]}>Convidar</Text>
            </Pressable>
          ) : null
        }
      />

      <View style={styles.toolbar}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar membro..."
        />
        <View style={{ height: spacing.sm }} />
        <SegmentedControl
          options={[
            { key: 'members', label: 'Membros' },
            { key: 'roles', label: 'Funções' },
            { key: 'instruments', label: 'Instrumentos' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Sua equipe ainda está vazia"
            description="Convide integrantes pelo código de convite da igreja."
            actionLabel={canManage ? 'Ver código' : undefined}
            onAction={canManage ? invite : undefined}
          />
        }
        renderItem={({ item }) => {
          const isEditing = editingId === item.id;
          return (
            <Pressable
              onPress={() => {
                if (isEditing) return;
                navigation.navigate('MemberDetail', {
                  memberId: item.id,
                  userId: item.user_id,
                });
              }}
              onLongPress={canManage ? () => startEdit(item) : undefined}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                  opacity: pressed && !isEditing ? 0.92 : 1,
                  ...shadow.sm,
                },
              ]}
            >
              {isEditing ? (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {item.profile?.name ?? 'Usuário'}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radius.md,
                      },
                    ]}
                    value={editInstrument}
                    onChangeText={setEditInstrument}
                    placeholder="Instrumento / função"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.roleRow}>
                    {(['musician', 'leader'] as UserRole[]).map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setEditRole(r)}
                        style={[
                          styles.roleChip,
                          {
                            backgroundColor:
                              editRole === r ? colors.primary : colors.surfaceSecondary,
                            borderRadius: radius.full,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: editRole === r ? colors.textInverse : colors.text,
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {roleLabel(r)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.editActions}>
                    <Button title="Salvar" onPress={saveEdit} size="sm" />
                    <Button
                      title="Cancelar"
                      onPress={() => setEditingId(null)}
                      variant="ghost"
                      size="sm"
                    />
                    <Button
                      title="Remover"
                      onPress={() => removeMember(item)}
                      variant="danger"
                      size="sm"
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Avatar
                    uri={item.profile?.avatar_url}
                    name={item.profile?.name}
                    size={48}
                  />
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {item.profile?.name ?? 'Usuário'}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {[item.instrument || '—', roleLabel(item.role)].join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </>
              )}
            </Pressable>
          );
        }}
      />
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    fontSize: 15,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
});
