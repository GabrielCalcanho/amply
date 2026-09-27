import React, {useCallback, useState, useMemo} from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  View,
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

function SimpleEntityListScreen({
  title,
  table,
  emptyTitle,
  emptyDesc,
}: {
  title: string;
  table: 'ministry_teams' | 'ministry_roles' | 'member_classifications';
  emptyTitle: string;
  emptyDesc: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, membership } = useAuth();
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select('id, name')
      .eq('church_id', church.id)
      .order('name');
    if (error) {
      setItems([]);
      Alert.alert('Erro', formatSupabaseError(error));
    } else {
      setItems((data as { id: string; name: string }[]) ?? []);
    }
    setLoading(false);
  }, [church, table]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const create = async () => {
    if (!name.trim() || !church) {
      Alert.alert('Erro', 'Informe o nome.');
      return;
    }
    if (!canManage) {
      Alert.alert('Erro', 'Apenas líderes e administradores podem criar.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from(table).insert({ church_id: church.id, name: name.trim() });
    setSaving(false);
    if (error) Alert.alert('Erro', formatSupabaseError(error));
    else {
      setModal(false);
      setName('');
      load();
    }
  };

  const remove = (item: { id: string; name: string }) => {
    if (!canManage) return;
    Alert.alert('Excluir', `Remover "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from(table).delete().eq('id', item.id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={title}
        right={
          canManage ? (
            <Pressable
              onPress={() => setModal(true)}
              hitSlop={12}
              accessibilityLabel="Adicionar"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="add" size={26} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      />
      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title={emptyTitle} description={emptyDesc} />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, canManage && pressed && { opacity: 0.7 }]}
              onLongPress={canManage ? () => remove(item) : undefined}
              accessibilityLabel={item.name}
            >
              <Text style={styles.rowText} numberOfLines={1}>
                {item.name}
              </Text>
              {canManage ? (
                <Pressable
                  onPress={() => remove(item)}
                  hitSlop={8}
                  accessibilityLabel={`Remover ${item.name}`}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : null}
            </Pressable>
          )}
          refreshing={loading}
          onRefresh={load}
        />
      )}
      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.modalBg} onPress={() => setModal(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.modalTitle}>Novo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Button title="Salvar" onPress={create} loading={saving} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, flexGrow: 1, gap: spacing.sm },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
  },
  modalTitle: { ...typography.h3, marginBottom: spacing.md, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.body,
    color: colors.text,
  },
})
}


export function TeamsScreen() {
  return (
    <SimpleEntityListScreen
      title="Equipes"
      table="ministry_teams"
      emptyTitle="Nenhuma equipe"
      emptyDesc="Crie equipes do ministério."
    />
  );
}

export function RolesScreen() {
  return (
    <SimpleEntityListScreen
      title="Funções"
      table="ministry_roles"
      emptyTitle="Nenhuma função"
      emptyDesc="Cadastre funções instrumentais."
    />
  );
}

export function ClassificationsScreen() {
  return (
    <SimpleEntityListScreen
      title="Classificações"
      table="member_classifications"
      emptyTitle="Nenhuma classificação"
      emptyDesc="Defina classificações personalizadas."
    />
  );
}
