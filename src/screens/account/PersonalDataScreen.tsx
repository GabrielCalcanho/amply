import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Input } from '../../components/Input';
import { DateField } from '../../components/DateField';
import { Button } from '../../components/Button';
import { spacing, radius, shadow } from '../../constants/theme';
import { formatSupabaseError } from '../../utils/payload';

export function PersonalDataScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile, membership, user, updateProfile, refreshMembership, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [instrument, setInstrument] = useState(membership?.instrument ?? '');
  const [saving, setSaving] = useState(false);

  const roleLabel =
    membership?.role === 'owner'
      ? 'Administrador'
      : membership?.role === 'leader'
        ? 'Líder'
        : 'Músico';

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await updateProfile({
        name: name.trim(),
        birth_date: birthDate || null,
      });
      if (error) {
        Alert.alert('Erro', error);
        return;
      }
      if (membership?.id) {
        const next = instrument.trim() || null;
        if (next !== (membership.instrument ?? null)) {
          const { error: mErr } = await supabase
            .from('church_members')
            .update({ instrument: next })
            .eq('id', membership.id);
          if (mErr) {
            Alert.alert('Erro', formatSupabaseError(mErr));
            return;
          }
          await refreshMembership();
        }
      }
      await refreshProfile?.();
      toast.success('Alterações salvas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Dados pessoais" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.xl,
              padding: spacing.md,
              ...shadow.sm,
            },
          ]}
        >
          <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          <DateField label="Data de nascimento" value={birthDate} onChange={setBirthDate} />
          <Input
            label="Instrumento"
            value={instrument}
            onChangeText={setInstrument}
            placeholder="Ex: Vocal, Violão..."
          />
          <View style={styles.readOnly}>
            <Text style={[styles.readLabel, { color: colors.textMuted }]}>Função</Text>
            <Text style={[styles.readValue, { color: colors.text }]}>{roleLabel}</Text>
          </View>
          <View style={styles.readOnly}>
            <Text style={[styles.readLabel, { color: colors.textMuted }]}>Email</Text>
            <Text style={[styles.readValue, { color: colors.text }]}>
              {user?.email ?? '—'}
            </Text>
          </View>
        </View>

        <Button
          title="Salvar alterações"
          onPress={save}
          loading={saving}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  card: { borderWidth: StyleSheet.hairlineWidth },
  readOnly: { marginBottom: spacing.md },
  readLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  readValue: { fontSize: 15, fontWeight: '500' },
});
