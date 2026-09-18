import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { radius, spacing, typography, ColorTokens } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { formatTime } from '../utils/dates';

interface TimeFieldProps {
  label: string;
  value: string; // HH:MM
  onChange: (hhmm: string) => void;
  error?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i < 10 ? `0${i}` : String(i)
);
const MINS = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
];

export function TimeField({ label, value, onChange, error }: TimeFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const display = value ? formatTime(value) : '';
  const [h, m] = (value || '19:00').split(':');

  const pick = (hour: string, min: string) => {
    onChange(`${hour}:${min}`);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.value, !display && styles.placeholder]}>
          {display || 'Toque para escolher o horário'}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.modal}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.title}>Horário</Text>
            <View style={styles.cols}>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[styles.item, h === hour && styles.itemOn]}
                    onPress={() => pick(hour, m?.slice(0, 2) || '00')}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        h === hour && styles.itemTextOn,
                      ]}
                    >
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                {MINS.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.item,
                      (m || '').slice(0, 2) === min && styles.itemOn,
                    ]}
                    onPress={() => pick(h || '19', min)}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        (m || '').slice(0, 2) === min && styles.itemTextOn,
                      ]}
                    >
                      {min}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.cancel}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    label: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    field: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    fieldError: { borderColor: colors.danger },
    value: { ...typography.body, color: colors.text },
    placeholder: { color: colors.textMuted },
    error: { ...typography.caption, color: colors.danger, marginTop: 4 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      maxHeight: '70%',
    },
    title: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    cols: { flexDirection: 'row', height: 220 },
    col: { flex: 1 },
    item: {
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: radius.sm,
    },
    itemOn: { backgroundColor: colors.primaryLight },
    itemText: { ...typography.body, color: colors.text },
    itemTextOn: { color: colors.primaryDark, fontWeight: '600' },
    cancel: {
      marginTop: spacing.md,
      alignItems: 'center',
      padding: spacing.sm,
    },
    cancelText: { ...typography.body, color: colors.textSecondary },
  });
}
