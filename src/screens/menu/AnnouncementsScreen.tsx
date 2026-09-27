import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { IconButton } from '../../components/IconButton';
import { ActionMenu, ActionMenuItem } from '../../components/ActionMenu';
import { spacing, radius, shadow } from '../../constants/theme';
import { formatSupabaseError } from '../../utils/payload';
import { notifyChurchMembers } from '../../utils/notifications';

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  priority: string;
  created_at: string;
  created_by: string | null;
};

type FilterKey = 'all' | 'important' | 'general';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function AnnouncementsScreen() {
  const { church, membership, user } = useAuth();
  const { colors } = useTheme();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [saving, setSaving] = useState(false);
  const [menuFor, setMenuFor] = useState<Announcement | null>(null);

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, priority, created_at, created_by')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false });
    if (error) setItems([]);
    else setItems((data as Announcement[]) ?? []);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    if (filter === 'important') return items.filter((i) => i.priority === 'high');
    if (filter === 'general') return items.filter((i) => i.priority !== 'high');
    return items;
  }, [items, filter]);

  const create = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Informe o título do aviso.');
      return;
    }
    if (!church || !user) {
      Alert.alert('Erro', 'Sessão inválida.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('announcements').insert({
      church_id: church.id,
      title: title.trim(),
      body: body.trim() || null,
      priority,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', formatSupabaseError(error));
      return;
    }
    try {
      await notifyChurchMembers({
        churchId: church.id,
        type: 'announcement',
        title: title.trim(),
        body: body.trim() || 'Novo aviso no ministério',
      });
    } catch {
      /* optional */
    }
    setModal(false);
    setTitle('');
    setBody('');
    setPriority('normal');
    load();
  };

  const remove = (item: Announcement) => {
    Alert.alert('Excluir aviso', 'Essa ação não poderá ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', item.id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else load();
        },
      },
    ]);
  };

  const menuItems: ActionMenuItem[] = menuFor
    ? [
        {
          key: 'delete',
          label: 'Excluir',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => remove(menuFor),
        },
      ]
    : [];

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Avisos"
        right={
          canManage ? (
            <IconButton
              icon="add"
              onPress={() => setModal(true)}
              accessibilityLabel="Novo aviso"
            />
          ) : null
        }
      />

      <View style={styles.toolbar}>
        <SegmentedControl
          options={[
            { key: 'all', label: 'Todos' },
            { key: 'important', label: 'Importantes' },
            { key: 'general', label: 'Geral' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="megaphone-outline"
              title="Nenhum aviso"
              description={
                canManage
                  ? 'Crie o primeiro aviso para o ministério.'
                  : 'Quando houver avisos, eles aparecerão aqui.'
              }
              actionLabel={canManage ? 'Criar aviso' : undefined}
              onAction={canManage ? () => setModal(true) : undefined}
            />
          }
          renderItem={({ item }) => {
            const important = item.priority === 'high';
            return (
              <Pressable
                onPress={() => {
                  Alert.alert(item.title, item.body || 'Sem descrição');
                }}
                onLongPress={canManage ? () => setMenuFor(item) : undefined}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: important ? colors.surfaceInverse : colors.surface,
                    borderColor: important ? 'transparent' : colors.border,
                    borderRadius: radius.xl,
                    opacity: pressed ? 0.92 : 1,
                    ...shadow.sm,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: important
                          ? 'rgba(255,255,255,0.15)'
                          : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={important ? colors.textInverse : colors.text}
                    />
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      { color: important ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
                    ]}
                  >
                    {important ? 'Importante' : 'Geral'}
                  </Text>
                  {canManage ? (
                    <IconButton
                      icon="ellipsis-horizontal"
                      size={18}
                      color={important ? colors.textInverse : colors.textMuted}
                      onPress={() => setMenuFor(item)}
                      style={{ width: 36, height: 36 }}
                    />
                  ) : (
                    <View style={{ width: 36 }} />
                  )}
                </View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: important ? colors.textInverse : colors.text },
                  ]}
                >
                  {item.title}
                </Text>
                {item.body ? (
                  <Text
                    style={[
                      styles.cardBody,
                      {
                        color: important
                          ? 'rgba(255,255,255,0.75)'
                          : colors.textSecondary,
                      },
                    ]}
                    numberOfLines={3}
                  >
                    {item.body}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.cardDate,
                    {
                      color: important
                        ? 'rgba(255,255,255,0.5)'
                        : colors.textMuted,
                    },
                  ]}
                >
                  {formatDate(item.created_at)}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      <ActionMenu
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title="Ações do aviso"
        items={menuItems}
      />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novo aviso</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radius.lg,
                },
              ]}
              placeholder="Título"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radius.lg,
                },
              ]}
              placeholder="Descrição"
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
            />
            <View style={styles.prioRow}>
              <Pressable
                onPress={() => setPriority('normal')}
                style={[
                  styles.prioChip,
                  {
                    backgroundColor:
                      priority === 'normal' ? colors.primary : colors.surfaceSecondary,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text
                  style={{
                    color: priority === 'normal' ? colors.textInverse : colors.text,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  Geral
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPriority('high')}
                style={[
                  styles.prioChip,
                  {
                    backgroundColor:
                      priority === 'high' ? colors.primary : colors.surfaceSecondary,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text
                  style={{
                    color: priority === 'high' ? colors.textInverse : colors.text,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  Importante
                </Text>
              </Pressable>
            </View>
            <Button title="Publicar" onPress={create} loading={saving} fullWidth />
            <Button
              title="Cancelar"
              onPress={() => setModal(false)}
              variant="ghost"
              fullWidth
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: 12,
  },
  card: {
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  prioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  prioChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
