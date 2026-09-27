import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Setlist, SETLIST_STATUS_LABELS, SetlistStatus } from '../../types';
import { colors, spacing, radius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateBR, formatTime, todayISO } from '../../utils/dates';

export function ScaleOverviewScreen() {
  const { colors } = useTheme();
  const { church } = useAuth();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    const { data } = await supabase
      .from('setlists')
      .select('*')
      .eq('church_id', church.id)
      .gte('date', todayISO())
      .order('date')
      .limit(20);
    setItems((data as Setlist[]) ?? []);
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Panorama de escala" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="Nenhuma escala futura" description="Crie escalas para ver o panorama." />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SetlistDetail', { setlistId: item.id })}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {formatDateBR(item.date)}
                {item.time ? ` · ${formatTime(item.time)}` : ''}
              </Text>
              <Text style={styles.status}>
                {SETLIST_STATUS_LABELS[(item.status as SetlistStatus) || 'scheduled']}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  status: { ...typography.small, color: colors.primary, marginTop: 6 },
});
