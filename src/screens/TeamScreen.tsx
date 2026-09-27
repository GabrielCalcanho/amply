import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { ChurchMember, UserRole } from '../types';
import { MINISTRY_DEFS, matchMinistryGroup } from '../constants/ministries';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { AppHeader } from '../components/layout/AppHeader';
import { Avatar } from '../components/Avatar';
import { SearchField } from '../components/SearchField';
import { SegmentedControl } from '../components/SegmentedControl';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { spacing, radius, shadow, typography } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';

type FilterKey = 'members' | 'roles' | 'instruments';

export function TeamScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { church, membership, user } = useAuth();
  const { colors } = useTheme();
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('members');
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInstrument, setEditInstrument] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('musician');

  useEffect(() => {
    const group = route.params?.filterInstrument;
    if (group && MINISTRY_DEFS.some((d) => d.key === group)) {
      setFilter('instruments');
      setActiveGroup(group);
      navigation.setParams({ filterInstrument: undefined });
    }
  }, [route.params?.filterInstrument]);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('church_members')
      .select('*, profile:profiles(*)')
      .eq('church_id', church.id)
      .order('created_at');
    if (error) setError(formatSupabaseError(error));
    else setMembers((data as ChurchMember[]) ?? []);
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
    if (filter === 'roles' && activeRole) {
      list = list.filter((m) => m.role === activeRole);
    }
    if (filter === 'instruments' && activeGroup) {
      list = list.filter((m) => matchMinistryGroup(m.instrument, activeGroup));
    }
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
  }, [members, search, filter, activeRole, activeGroup]);

  const roleChips = useMemo(() => {
    const present = new Set(members.map((m) => m.role));
    return (['owner', 'leader', 'musician'] as UserRole[]).filter((r) => present.has(r));
  }, [members]);

  const selectFilter = (key: FilterKey) => {
    setFilter(key);
    setActiveRole(null);
    setActiveGroup(null);
  };

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

  if (error) {
    return (
      <TabScreenShell>
        <AppHeader title="Equipe" showNotifications={false} showAvatar={false} />
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={load}
        />
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
          onChange={selectFilter}
        />
        {filter === 'roles' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {roleChips.map((r) => {
              const active = activeRole === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setActiveRole(active ? null : r)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radius.full,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.textInverse : colors.text },
                    ]}
                  >
                    {roleLabel(r)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {filter === 'instruments' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {MINISTRY_DEFS.map((d) => {
              const active = activeGroup === d.key;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => setActiveGroup(active ? null : d.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radius.full,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.textInverse : colors.text },
                    ]}
                  >
                    {d.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
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
                        style={({ pressed }) => [
                          styles.roleChip,
                          {
                            backgroundColor:
                              editRole === r ? colors.primary : colors.surfaceSecondary,
                            borderRadius: radius.full,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: editRole === r ? colors.textInverse : colors.text },
                          ]}
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
                    <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
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
  chips: {
    flexGrow: 0,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  inviteText: {
    ...typography.caption,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.cardTitle,
  },
  meta: {
    ...typography.caption,
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
