import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INSTRUMENTS,
  INSTRUMENT_CATEGORIES,
  InstrumentCategoryId,
} from '../constants/instruments';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';

type Props = {
  selected: string[];
  onChange: (labels: string[]) => void;
};

export function InstrumentPicker({ selected, onChange }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<InstrumentCategoryId | 'all'>('all');

  const toggle = (label: string) => {
    if (selected.includes(label)) {
      onChange(selected.filter((s) => s !== label));
    } else {
      onChange([...selected, label]);
    }
  };

  const filtered =
    category === 'all' ? INSTRUMENTS : INSTRUMENTS.filter((i) => i.category === category);

  return (
    <View>
      <Text style={styles.label}>Instrumentos</Text>
      <View style={styles.chips}>
        {selected.length === 0 ? (
          <Text style={styles.placeholder}>Nenhum instrumento selecionado</Text>
        ) : (
          selected.map((label) => (
            <TouchableOpacity
              key={label}
              style={styles.chipOn}
              onPress={() => toggle(label)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipOnText}>{label}</Text>
              <Ionicons name="close" size={14} color={colors.primaryDark} />
            </TouchableOpacity>
          ))
        )}
      </View>
      <TouchableOpacity style={styles.openBtn} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.openBtnText}>Selecionar instrumentos</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Instrumentos</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={styles.done}>Concluir</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            <Pressable
              style={[styles.catChip, category === 'all' && styles.catChipOn]}
              onPress={() => setCategory('all')}
            >
              <Text style={[styles.catText, category === 'all' && styles.catTextOn]}>Todos</Text>
            </Pressable>
            {INSTRUMENT_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.catChip, category === c.id && styles.catChipOn]}
                onPress={() => setCategory(c.id)}
              >
                <Ionicons
                  name={c.icon as any}
                  size={14}
                  color={category === c.id ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.catText, category === c.id && styles.catTextOn]}>{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.grid}>
            {filtered.map((inst) => {
              const on = selected.includes(inst.label);
              return (
                <TouchableOpacity
                  key={inst.id}
                  style={[styles.card, on && styles.cardOn]}
                  onPress={() => toggle(inst.label)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconWrap, on && { backgroundColor: colors.primaryLight }]}>
                    <Ionicons
                      name={inst.icon as any}
                      size={22}
                      color={on ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.cardLabel, on && { color: colors.primaryDark }]} numberOfLines={2}>
                    {inst.label}
                  </Text>
                  {on ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.check} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
    placeholder: { ...typography.caption, color: colors.textMuted },
    chipOn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    chipOnText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
    openBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: spacing.md,
    },
    openBtnText: { ...typography.bodyMedium, color: colors.primary },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    modalTitle: { ...typography.h3, color: colors.text },
    done: { ...typography.bodyMedium, color: colors.primary },
    catRow: { maxHeight: 44, marginBottom: spacing.sm },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catChipOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    catText: { ...typography.caption, color: colors.textSecondary },
    catTextOn: { color: colors.primaryDark, fontWeight: '600' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.md,
      gap: 10,
      paddingBottom: 40,
    },
    card: {
      width: '30%',
      flexGrow: 1,
      minWidth: '28%',
      maxWidth: '32%',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 96,
    },
    cardOn: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    cardLabel: { ...typography.small, color: colors.text, textAlign: 'center' },
    check: { position: 'absolute', top: 6, right: 6 },
  });
}
