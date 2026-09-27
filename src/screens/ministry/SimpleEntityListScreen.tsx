import React, { useCallback, useState, useMemo } from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  Platform,
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
import { Input } from '../../components/Input';
import { spacing, typography, radius, ColorTokens } from '../../constants/theme';
import { formatSupabaseError } from '../../utils/payload';

type EntityTable = 'ministry_teams' | 'ministry_roles' | 'member_classifications';

function SimpleEntityListScreen({
  title,
  table,
  icon,
  singular,
  emptyTitle,
  emptyDesc,
}: {
  title: string;
  table: EntityTable;
  icon: keyof typeof Ionicons.glyphMap;
  singular: string;
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

  const openCreate = () => {
    setName('');
    setModal(true);
  };

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
    const { error } = await supabase
      .from(table)
      .insert({ church_id: church.id, name: name.trim() });
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
              onPress={openCreate}
              hitSlop={12}
              accessibilityLabel={`Adicionar ${singular}`}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon={icon}
              title={emptyTitle}
              description={emptyDesc}
              actionLabel={canManage ? `Criar ${singular}` : undefined}
              onAction={canManage ? openCreate : undefined}
            />
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={styles.count}>
                {items.length} {items.length === 1 ? singular : `${singular}s`}
              </Text>
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          style={[
            styles.listSurface,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name={icon} size={18} color={colors.text} />
              </View>
              <Text style={styles.rowText} numberOfLines={1}>
                {item.name}
              </Text>
              {canManage ? (
                <Pressable
                  onPress={() => remove(item)}
                  hitSlop={10}
                  accessibilityLabel={`Remover ${item.name}`}
                  style={({ pressed }) => [styles.trash, { opacity: pressed ? 0.5 : 1 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          )}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBg}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModal(false)} />
          <View style={styles.modal}>
            <View style={styles.grabber} />
            <Text style={styles.modalTitle}>
              {singular.charAt(0).toUpperCase() + singular.slice(1)}
            </Text>
            <Input
              label="Nome"
              placeholder={`Nome d${singular.endsWith('a') ? 'a' : 'o'} ${singular}`}
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={create}
              returnKeyType="done"
            />
            <Button title="Salvar" onPress={create} loading={saving} fullWidth />
            <Button
              title="Cancelar"
              variant="ghost"
              onPress={() => setModal(false)}
              fullWidth
              style={styles.cancelBtn}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    addBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxxl,
    },
    count: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    listSurface: {
      marginHorizontal: spacing.md,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    sep: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 60,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      ...typography.bodyMedium,
      color: colors.text,
      flex: 1,
    },
    trash: {
      padding: 6,
    },
    modalBg: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
    },
    modal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
    cancelBtn: { marginTop: spacing.xs },
  });
}

export function TeamsScreen() {
  return (
    <SimpleEntityListScreen
      title="Equipes"
      table="ministry_teams"
      icon="people-outline"
      singular="equipe"
      emptyTitle="Nenhuma equipe"
      emptyDesc="Crie equipes para organizar seu ministério."
    />
  );
}

export function RolesScreen() {
  return (
    <SimpleEntityListScreen
      title="Funções"
      table="ministry_roles"
      icon="briefcase-outline"
      singular="função"
      emptyTitle="Nenhuma função"
      emptyDesc="Cadastre funções instrumentais e de apoio."
    />
  );
}

export function ClassificationsScreen() {
  return (
    <SimpleEntityListScreen
      title="Classificações"
      table="member_classifications"
      icon="pricetags-outline"
      singular="classificação"
      emptyTitle="Nenhuma classificação"
      emptyDesc="Defina classificações personalizadas para os membros."
    />
  );
}
