import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { spacing, typography, ColorTokens } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export function ChordViewerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { title, content } = route.params ?? {};

  const [fontSize, setFontSize] = useState(16);
  const [dark, setDark] = useState(false);

  const bg = dark ? '#1A1A1A' : colors.background;
  const fg = dark ? '#E8E8E8' : colors.text;
  const chordColor = dark ? '#A8C090' : colors.primary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.toolBtn, { color: chordColor }]}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.tools}>
          <TouchableOpacity onPress={() => setFontSize((s) => Math.max(12, s - 2))}>
            <Text style={[styles.toolBtn, { color: fg }]}>A−</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFontSize((s) => Math.min(28, s + 2))}>
            <Text style={[styles.toolBtn, { color: fg }]}>A+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDark((d) => !d)}>
            <Text style={[styles.toolBtn, { color: fg }]}>{dark ? 'Claro' : 'Escuro'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.title, { color: fg }]}>{title}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ fontSize, color: fg, lineHeight: fontSize * 1.6, fontFamily: 'monospace' }}>
          {content || 'Sem conteúdo'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tools: { flexDirection: 'row', gap: spacing.md },
  toolBtn: { ...typography.bodyMedium },
  title: {
    ...typography.h3,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
})
}

