import React, {useCallback, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { NotificationItem } from '../types';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { formatSupabaseError } from '../utils/payload';

export function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (loadError) {
      setError(formatSupabaseError(loadError));
      setItems([]);
    } else {
      setItems((data as NotificationItem[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markRead = async (n: NotificationItem) => {
    if (n.read_at) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', n.id)
      .eq('user_id', user!.id);
    if (error) console.warn(formatSupabaseError(error));
    else setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
  };

  const markAll = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    load();
  };

  const openNotification = (n: NotificationItem) => {
    markRead(n);
    if (n.type === 'message' && n.data?.conversation_id) {
      navigation.navigate('Chat', {
        conversationId: n.data.conversation_id as string,
        title: n.title,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="Notificações" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title="Notificações"
        right={
          <TouchableOpacity onPress={markAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.link}>Ler todas</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Não foi possível carregar"
              description={error}
              actionLabel="Tentar novamente"
              onAction={load}
            />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="Nenhuma notificação"
              description="Avisos de escalas, presença e aniversários aparecerão aqui."
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.read_at && styles.unread]}
            onPress={() => openNotification(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}${item.read_at ? '' : ', não lida'}`}
          >
            <View style={styles.itemRow}>
              {!item.read_at ? <View style={styles.unreadDot} /> : null}
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            </View>
            {item.body ? <Text style={styles.itemBody} numberOfLines={3}>{item.body}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  list: { padding: spacing.lg, flexGrow: 1 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.borderStrong, backgroundColor: colors.primaryMuted },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  itemTitle: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  itemBody: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
})
}

