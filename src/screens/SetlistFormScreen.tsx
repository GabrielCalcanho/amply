import React, {useEffect, useState, useMemo} from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { emptyToNull, formatSupabaseError } from '../utils/payload';
import { notifyChurchMembers } from '../utils/notifications';
import { toPostgresTime, todayISO, formatTime } from '../utils/dates';
import { SetlistStatus, SETLIST_STATUS_LABELS } from '../types';

const STATUS_OPTIONS: SetlistStatus[] = [
  'draft',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
];

export function SetlistFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, user, membership } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const setlistId = route.params?.setlistId as string | undefined;

  const [title, setTitle] = useState('Culto de Domingo');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<SetlistStatus>('scheduled');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!setlistId);
  const [dateError, setDateError] = useState('');

  const canManage = membership?.role === 'owner' || membership?.role === 'leader';

  useEffect(() => {
    if (!setlistId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .eq('id', setlistId)
        .single();
      if (cancelled) return;
      setLoadingData(false);
      if (error) {
        Alert.alert('Erro', formatSupabaseError(error));
        return;
      }
      if (data) {
        setTitle(data.title ?? '');
        setDate(data.date ?? todayISO());
        setTime(data.time ? formatTime(data.time) : '');
        setLocation(data.location ?? '');
        setNotes(data.notes ?? '');
        setStatus((data.status as SetlistStatus) || 'scheduled');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setlistId]);

  const handleSave = async () => {
    setDateError('');
    if (!title.trim()) {
      Alert.alert('Erro', 'Informe o título da escala');
      return;
    }
    if (!date) {
      setDateError('Informe uma data válida.');
      return;
    }
    if (!church || !user) {
      Alert.alert('Erro', 'Sessão ou ministério não carregados.');
      return;
    }
    if (!canManage) {
      Alert.alert('Erro', 'Apenas líderes e administradores podem gerenciar escalas.');
      return;
    }

    const timeValue = time ? toPostgresTime(time) : null;
    if (time && !timeValue) {
      Alert.alert('Erro', 'Horário inválido.');
      return;
    }

    setLoading(true);
    // Explicit payload — never send undefined (PostgREST rejects or ignores inconsistently)
    const payload: Record<string, string | null> = {
      title: title.trim(),
      date: date.slice(0, 10),
      time: timeValue,
      location: emptyToNull(location),
      notes: emptyToNull(notes),
      status: status || 'scheduled',
    };

    let error;
    if (setlistId) {
      ({ error } = await supabase.from('setlists').update(payload).eq('id', setlistId));
    } else {
      ({ error } = await supabase.from('setlists').insert({
        ...payload,
        church_id: church.id,
        created_by: user.id,
      }));
    }
    setLoading(false);

    if (error) {
      console.warn('[AMPLY] setlist save error', error);
      Alert.alert('Erro ao salvar escala', formatSupabaseError(error));
      return;
    }

    if (!setlistId && church) {
      await notifyChurchMembers({
        churchId: church.id,
        type: 'setlist_new',
        title: 'Nova escala',
        body: `${title.trim()} — confira no app.`,
        excludeUserId: user?.id,
        data: { kind: 'setlist' },
      });
    }

    Alert.alert('Sucesso', setlistId ? 'Escala atualizada.' : 'Escala criada com sucesso.');
    navigation.goBack();
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Escala" />
        <Text style={{ padding: spacing.lg, ...typography.body, color: colors.textMuted }}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={setlistId ? 'Editar escala' : 'Nova escala'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Informações</Text>
        <Input
          label="Título *"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Culto de Domingo"
        />
        <DateField
          label="Data"
          value={date}
          onChange={setDate}
          required
          showQuickActions
          error={dateError}
        />
        <TimeField label="Horário" value={time} onChange={setTime} />
        <Input
          label="Local"
          value={location}
          onChangeText={setLocation}
          placeholder="Ex: Templo principal"
        />
        <Input
          label="Observações"
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas"
          multiline
          style={{ height: 80 }}
        />

        <Text style={styles.section}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, status === s && styles.chipOn]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextOn]}>
                {SETLIST_STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={setlistId ? 'Salvar alterações' : status === 'draft' ? 'Salvar rascunho' : 'Criar escala'}
          onPress={handleSave}
          loading={loading}
          style={styles.btn}
        />
        <Button title="Cancelar" onPress={() => navigation.goBack()} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextOn: { color: colors.primaryDark, fontWeight: '600' },
  btn: { marginTop: spacing.md },
})
}

