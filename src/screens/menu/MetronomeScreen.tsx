import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { spacing, typography, radius, ColorTokens } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const MIN_BPM = 40;
const MAX_BPM = 240;

function clampBpm(n: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}

function playClick() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 1000;
      g.gain.value = 0.1;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    } catch {
      /* ignore */
    }
    return;
  }
  // Native: short vibration as click feedback (no extra audio dependency)
  try {
    Vibration.vibrate(12);
  } catch {
    /* ignore */
  }
}

export function MetronomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (!running) return;
    const ms = Math.round(60000 / bpm);
    // Immediate first click when starting
    playClick();
    setBeat((b) => (b + 1) % 4);
    timer.current = setInterval(() => {
      playClick();
      setBeat((b) => (b + 1) % 4);
    }, ms);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, bpm]);

  const changeBpm = useCallback((delta: number) => {
    setBpm((b) => clampBpm(b + delta));
  }, []);

  const onTapTempo = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length < 2) return;
    const intervals: number[] = [];
    for (let i = 1; i < taps.current.length; i++) {
      intervals.push(taps.current[i] - taps.current[i - 1]);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avg > 0) {
      setBpm(clampBpm(60000 / avg));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Metrônomo" />
      <View style={styles.body}>
        <View style={styles.beats}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.beatDot,
                running && beat === i && styles.beatDotOn,
                running && beat === i && i === 0 && styles.beatDotAccent,
              ]}
            />
          ))}
        </View>

        <Text style={styles.bpm}>{bpm}</Text>
        <Text style={styles.label}>BPM</Text>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => changeBpm(-5)} accessibilityLabel="Diminuir 5">
            <Text style={styles.btnText}>−5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => changeBpm(-1)} accessibilityLabel="Diminuir 1">
            <Text style={styles.btnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => changeBpm(1)} accessibilityLabel="Aumentar 1">
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => changeBpm(5)} accessibilityLabel="Aumentar 5">
            <Text style={styles.btnText}>+5</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.tapBtn} onPress={onTapTempo} activeOpacity={0.7}>
          <Text style={styles.tapText}>Toque o tempo (Tap)</Text>
          <Text style={styles.tapHint}>Toque 2+ vezes no ritmo</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.mainBtn, running && styles.stop]}
            onPress={() => setRunning((r) => !r)}
          >
            <Text style={styles.mainText}>{running ? 'Pausar' : 'Iniciar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghost}
            onPress={() => {
              setRunning(false);
              setBeat(0);
              taps.current = [];
            }}
          >
            <Text style={styles.ghostText}>Parar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  beats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  beatDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  beatDotOn: { backgroundColor: colors.primary },
  beatDotAccent: { backgroundColor: colors.primaryDark ?? colors.primary },
  bpm: { fontSize: 64, fontWeight: '700', color: colors.text, letterSpacing: -1 },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xl, marginTop: 4 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  btn: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 18, fontWeight: '600', color: colors.text },
  tapBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 220,
  },
  tapText: { ...typography.bodyMedium, color: colors.primary },
  tapHint: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  mainBtn: {
    minWidth: 140,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stop: { backgroundColor: colors.warning },
  mainText: { ...typography.bodyMedium, color: colors.white },
  ghost: { height: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  ghostText: { ...typography.body, color: colors.textSecondary },
})
}

