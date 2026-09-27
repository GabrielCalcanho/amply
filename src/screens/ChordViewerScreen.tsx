import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, ColorTokens, getColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export function ChordViewerScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { title, content } = route.params ?? {};

  const [fontSize, setFontSize] = useState(17);
  const [dark, setDark] = useState(isDark);

  // Manual reading mode — neutral palette only, independent of the app theme.
  const reading = getColors(dark ? 'dark' : 'light');
  const bg = reading.background;
  const fg = reading.text;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['bottom']}>
      <ScreenHeader
        title={title || 'Cifra'}
        transparent
        titleColor={fg}
        iconColor={fg}
        right={
          <View style={styles.tools}>
            <Pressable
              onPress={() => setFontSize((s) => Math.max(13, s - 1))}
              hitSlop={8}
              accessibilityLabel="Diminuir fonte"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.toolBtn, { color: fg }]}>A−</Text>
            </Pressable>
            <Pressable
              onPress={() => setFontSize((s) => Math.min(28, s + 1))}
              hitSlop={8}
              accessibilityLabel="Aumentar fonte"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.toolBtn, { color: fg }]}>A+</Text>
            </Pressable>
            <Pressable
              onPress={() => setDark((d) => !d)}
              hitSlop={8}
              accessibilityLabel={dark ? 'Modo claro' : 'Modo escuro'}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons
                name={dark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={fg}
              />
            </Pressable>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize,
            color: fg,
            lineHeight: fontSize * 1.75,
            fontFamily: 'monospace',
            letterSpacing: 0.2,
          }}
          selectable
        >
          {content || 'Sem conteúdo de cifra.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1 },
    tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    toolBtn: { ...typography.bodyMedium, fontSize: 16 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxxl,
    },
  });
}
