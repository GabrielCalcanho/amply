import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, typography, ColorTokens } from '../constants/theme';
import { formatDateBR, toISODate, todayISO } from '../utils/dates';

interface DateFieldProps {
  label: string;
  value: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  required?: boolean;
  showQuickActions?: boolean;
  error?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

export function DateField({
  label,
  value,
  onChange,
  required,
  showQuickActions,
  error,
}: DateFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'day' | 'year' | 'month'>('day');
  const [viewYear, setViewYear] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return Number.isNaN(d.getTime()) ? CURRENT_YEAR : d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return Number.isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  });

  const display = value ? formatDateBR(value) : '';

  const openPicker = () => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      if (!Number.isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
    setMode('day');
    setOpen(true);
  };

  const selectDay = (day: number) => {
    onChange(toISODate(new Date(viewYear, viewMonth, day, 12, 0, 0)));
    setOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'short' })
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TouchableOpacity style={[styles.field, error ? styles.fieldError : null]} onPress={openPicker}>
        <Text style={[styles.value, !display && styles.placeholder]}>
          {display || 'Toque para escolher a data'}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {showQuickActions ? (
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.chip} onPress={() => onChange(todayISO())}>
            <Text style={styles.chipText}>Hoje</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.modeRow}>
              <TouchableOpacity onPress={() => setMode('year')} style={styles.modeBtn}>
                <Text style={[styles.modeText, mode === 'year' && styles.modeTextOn]}>{viewYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('month')} style={styles.modeBtn}>
                <Text style={[styles.modeText, mode === 'month' && styles.modeTextOn]}>
                  {months[viewMonth]}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('day')} style={styles.modeBtn}>
                <Text style={[styles.modeText, mode === 'day' && styles.modeTextOn]}>Dia</Text>
              </TouchableOpacity>
            </View>

            {mode === 'year' ? (
              <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={styles.yearGrid}>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearCell, y === viewYear && styles.yearCellOn]}
                    onPress={() => {
                      setViewYear(y);
                      setMode('month');
                    }}
                  >
                    <Text style={[styles.yearText, y === viewYear && styles.yearTextOn]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : mode === 'month' ? (
              <View style={styles.monthGrid}>
                {months.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthCell, i === viewMonth && styles.yearCellOn]}
                    onPress={() => {
                      setViewMonth(i);
                      setMode('day');
                    }}
                  >
                    <Text style={[styles.yearText, i === viewMonth && styles.yearTextOn]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.monthNav}>
                  <TouchableOpacity
                    onPress={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear((y) => y - 1);
                      } else setViewMonth((m) => m - 1);
                    }}
                  >
                    <Text style={styles.navBtn}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>{monthLabel}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0);
                        setViewYear((y) => y + 1);
                      } else setViewMonth((m) => m + 1);
                    }}
                  >
                    <Text style={styles.navBtn}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.weekRow}>
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <Text key={i} style={styles.weekDay}>
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((day, idx) => {
                    if (day == null) return <View key={`e${idx}`} style={styles.dayCell} />;
                    const iso = toISODate(new Date(viewYear, viewMonth, day, 12, 0, 0));
                    const selected = value === iso;
                    return (
                      <TouchableOpacity
                        key={iso}
                        style={[styles.dayCell, selected && styles.daySelected]}
                        onPress={() => selectDay(day)}
                      >
                        <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
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
    label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
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
    quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
    },
    chipText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      maxHeight: '80%',
    },
    modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    modeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceSecondary,
    },
    modeText: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
    modeTextOn: { color: colors.primary, fontWeight: '700' },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    yearCell: {
      width: '22%',
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    yearCellOn: { backgroundColor: colors.primary },
    yearText: { ...typography.caption, color: colors.text },
    yearTextOn: { color: '#fff', fontWeight: '700' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    monthCell: {
      width: '30%',
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    navBtn: { fontSize: 28, color: colors.primary, paddingHorizontal: spacing.sm },
    monthTitle: { ...typography.bodyMedium, color: colors.text, textTransform: 'capitalize' },
    weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    weekDay: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySelected: { backgroundColor: colors.primary, borderRadius: radius.full },
    dayText: { ...typography.body, color: colors.text },
    dayTextSelected: { color: '#fff', fontWeight: '600' },
    cancel: { marginTop: spacing.md, alignItems: 'center', padding: spacing.sm },
    cancelText: { ...typography.body, color: colors.textSecondary },
  });
}
