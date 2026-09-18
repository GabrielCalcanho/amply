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
import { DateField } from '../../components/DateField';
import { spacing, typography, radius, ColorTokens } from '../../constants/theme';
import { formatSupabaseError } from '../../utils/payload';
import { todayISO, formatDateBR } from '../../utils/dates';

type Row = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  user_id: string;
};

export function UnavailabilityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!church || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('member_unavailability')
      .select('id, start_date, end_date, reason, user_id')
      .eq('church_id', church.id)
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });
    if (error) setItems([]);
    else setItems((data as Row[]) ?? []);
    setLoading(false);
  }, [church, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const create = async () => {
    if (!start || !end) {
      Alert.alert('Erro', 'Informe data início e fim (AAAA-MM-DD).');
      return;
    }
    if (end < start) {
      Alert.alert('Erro', 'Data fim deve ser igual ou após o início.');
      return;
    }
    if (!church || !user) return;
    setSaving(true);
    const { error } = await supabase.from('member_unavailability').insert({
      church_id: church.id,
      user_id: user.id,
      start_date: start,
      end_date: end,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', formatSupabaseError(error));
      return;
    }
    setModal(false);
    setReason('');
    setStart(todayISO());
    setEnd(todayISO());
    load();
  };

  const remove = (id: string) => {
    Alert.alert('Remover', 'Remover este período de indisponibilidade?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('member_unavailability').delete().eq('id', id);
          if (error) Alert.alert('Erro', formatSupabaseError(error));
          else load();
        },
      },
    ]);
  };

  const fmt = (d: string) => {
    try {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch {
      return d;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title="Indisponibilidade"
        right={
          <TouchableOpacity onPress={() => setModal(true)} accessibilityLabel="Nova indisponibilidade" style={styles.addBtn}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
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
              title="Nenhum período"
              description="Registre quando você não poderá participar das escalas."
              actionLabel="Registrar"
              onAction={() => setModal(true)}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.dates}>
                {fmt(item.start_date)}
                {item.end_date !== item.start_date ? ` → ${fmt(item.end_date)}` : ''}
              </Text>
              {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.del}>
                <Text style={styles.delText}>Remover</Text>
              </TouchableOpacity>
            </View>
          )}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.modalBg} onPress={() => setModal(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.modalTitle}>Nova indisponibilidade</Text>
            <DateField label="Início" value={start} onChange={setStart} required />
            <DateField label="Fim" value={end} onChange={setEnd} required />
            <Text style={styles.label}>Motivo (opcional)</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Viagem, trabalho..."
              placeholderTextColor={colors.textMuted}
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
  dates: { ...typography.bodyMedium, color: colors.text },
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  del: { marginTop: spacing.sm },
  delText: { ...typography.caption, color: colors.danger },
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
})
}

