import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, typography, ColorTokens } from '../constants/theme';
import { Song } from '../types';

export function SongRow({
  song,
  onPress,
  onToggleFavorite,
  onLongPress,
}: {
  song: Song;
  onPress: () => void;
  onToggleFavorite?: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const meta = [song.artist, song.key].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {onToggleFavorite ? (
        <TouchableOpacity
          onPress={onToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.fav}
        >
          <Ionicons
            name={song.is_favorite ? 'heart' : 'heart-outline'}
            size={20}
            color={song.is_favorite ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta || 'Sem artista'}
        </Text>
      </View>
      {song.bpm ? <Text style={styles.bpm}>{song.bpm}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    fav: { padding: 2 },
    body: { flex: 1, minWidth: 0 },
    title: { ...typography.bodyMedium, color: colors.text },
    meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    bpm: { ...typography.small, color: colors.textMuted, marginRight: 4 },
  });
}
