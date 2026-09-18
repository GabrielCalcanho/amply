import React, {useCallback, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { spacing, typography, radius, ColorTokens } from '../../constants/theme';
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

export function AnnouncementsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership, user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [saving, setSaving] = useState(false);
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
    await notifyChurchMembers({
      churchId: church.id,
      type: 'admin_notice',
      title: title.trim(),
      body: body.trim() || null,
      excludeUserId: user.id,
      data: { kind: 'announcement' },
    });
    setModal(false);
    setTitle('');
    setBody('');
    setPriority('normal');
    load();
  };

  const remove = (id: string) => {
    Alert.alert('Excluir aviso', 'Deseja excluir este aviso?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title="Avisos"
        right={
          canManage ? (
            <TouchableOpacity onPress={() => setModal(true)} accessibilityLabel="Novo aviso" style={styles.addBtn}>
              <Ionicons name="add" size={26} color={colors.primary} />
            </TouchableOpacity>
          ) : null
        }
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Nenhum aviso"
              description="Comunicados do ministério aparecerão aqui. Aplique a migration 005 se as tabelas ainda não existirem."
              actionLabel={canManage ? 'Criar aviso' : undefined}
              onAction={canManage ? () => setModal(true) : undefined}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.priority === 'high' ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Alta</Text>
                  </View>
                ) : null}
              </View>
              {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
                {canManage ? (
                  <TouchableOpacity onPress={() => remove(item.id)}>
                    <Text style={styles.delete}>Excluir</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.modalBg} onPress={() => setModal(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.modalTitle}>Novo aviso</Text>
            <TextInput
              style={styles.input}
              placeholder="Título"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.area]}
              placeholder="Conteúdo (opcional)"
              value={body}
              onChangeText={setBody}
              multiline
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.prioRow}>
              <TouchableOpacity
                style={[styles.prioBtn, priority === 'normal' && styles.prioActive]}
                onPress={() => setPriority('normal')}
              >
                <Text style={styles.prioText}>Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.prioBtn, priority === 'high' && styles.prioActive]}
                onPress={() => setPriority('high')}
              >
                <Text style={styles.prioText}>Alta</Text>
              </TouchableOpacity>
            </View>
            <Button title="Publicar" onPress={create} loading={saving} />
            <Button title="Cancelar" variant="ghost" onPress={() => setModal(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1, paddingBottom: spacing.xxl },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  badge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.small, color: colors.danger, fontWeight: '600' },
  cardBody: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  meta: { ...typography.small, color: colors.textMuted },
  delete: { ...typography.caption, color: colors.danger },
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  area: { minHeight: 88, textAlignVertical: 'top' },
  prioRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  prioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  prioActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  prioText: { ...typography.label, color: colors.text },
})
}

