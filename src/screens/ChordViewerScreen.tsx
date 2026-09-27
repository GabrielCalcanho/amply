import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, ColorTokens } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export function ChordViewerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { title, content } = route.params ?? {};

  const [fontSize, setFontSize] = useState(17);
  const [dark, setDark] = useState(false);

  const bg = dark ? '#1A1C19' : colors.background;
  const fg = dark ? '#EDECE8' : colors.text;
  const accent = dark ? '#A3B38F' : colors.primary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['bottom']}>
      <ScreenHeader
        title={title || 'Cifra'}
        right={
          <View style={styles.tools}>
            <TouchableOpacity
              onPress={() => setFontSize((s) => Math.max(13, s - 1))}
              hitSlop={8}
            >
              <Text style={[styles.toolBtn, { color: fg }]}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFontSize((s) => Math.min(28, s + 1))}
              hitSlop={8}
            >
              <Text style={[styles.toolBtn, { color: fg }]}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDark((d) => !d)} hitSlop={8}>
              <Ionicons
                name={dark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={fg}
              />
            </TouchableOpacity>
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
