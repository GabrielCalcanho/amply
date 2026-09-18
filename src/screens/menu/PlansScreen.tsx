import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { spacing, typography, radius, ColorTokens } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export function PlansScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Planos" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.planName}>Plano atual</Text>
          <Text style={styles.planValue}>Gratuito</Text>
          <Text style={styles.desc}>
            Estrutura preparada para limites futuros (membros, equipes, escalas). Cobrança real em etapa posterior.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.planName}>Recursos</Text>
          <Text style={styles.bullet}>• Escalas e repertório ilimitados (nesta fase)</Text>
          <Text style={styles.bullet}>• Equipes, funções e classificações</Text>
          <Text style={styles.bullet}>• Avisos e indisponibilidade</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  planName: { ...typography.caption, color: colors.textMuted },
  planValue: { ...typography.h2, color: colors.primary, marginTop: 4 },
  desc: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  bullet: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
})
}

