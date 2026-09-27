import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { NotificationItem, NotificationType } from '../types';
import { spacing, typography, radius, ColorTokens } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { formatSupabaseError } from '../utils/payload';
import { formatRelativeTime, dayBucketLabel } from '../utils/dates';

type Filter = 'all' | 'unread';

function notificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'message':
      return 'chatbubble-ellipses-outline';
    case 'presence_pending':
      return 'checkmark-done-outline';
    case 'setlist_new':
    case 'setlist_updated':
      return 'calendar-outline';
    case 'birthday':
      return 'gift-outline';
    case 'announcement':
      return 'megaphone-outline';
    case 'admin_notice':
      return 'information-circle-outline';
    default:
      return 'notifications-outline';
  }
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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

  const unreadCount = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  const sections = useMemo(() => {
    const visible = filter === 'unread' ? items.filter((i) => !i.read_at) : items;
    const grouped: { title: string; data: NotificationItem[] }[] = [];
    for (const item of visible) {
      const label = dayBucketLabel(item.created_at) || 'Anteriores';
      const last = grouped[grouped.length - 1];
      if (last && last.title === label) last.data.push(item);
      else grouped.push({ title: label, data: [item] });
    }
    return grouped;
  }, [items, filter]);

  const markRead = async (n: NotificationItem) => {
    if (n.read_at) return;
    const at = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: at } : x)));
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: at })
      .eq('id', n.id)
      .eq('user_id', user!.id);
    if (error) console.warn(formatSupabaseError(error));
  };

  const markAll = async () => {
    if (!user || unreadCount === 0) return;
    const at = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: at })));
    await supabase
      .from('notifications')
      .update({ read_at: at })
      .eq('user_id', user.id)
      .is('read_at', null);
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

  const showAction = unreadCount > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Notificações" />

      {/* Action — clearly a tappable action (icon + label), not a filter */}
      {showAction ? (
        <TouchableOpacity
          onPress={markAll}
          style={styles.actionRow}
          activeOpacity={0.55}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Marcar todas como lidas"
        >
          <Ionicons name="checkmark-done-outline" size={16} color={colors.text} />
          <Text style={styles.actionText}>Marcar todas como lidas</Text>
        </TouchableOpacity>
      ) : null}

      {/* Filter — a segmented control, visually distinct from the action */}
      <View style={styles.filterWrap}>
        <View style={styles.segmentTrack}>
          {(['all', 'unread'] as Filter[]).map((f) => {
            const active = filter === f;
            const label = f === 'all' ? 'Todas' : 'Não lidas';
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.9}
                style={[styles.segment, active && styles.segmentActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, { color: active ? colors.text : colors.textMuted }]}>
                  {label}
                </Text>
                {f === 'unread' && unreadCount > 0 ? (
                  <View style={[styles.countPill, { backgroundColor: active ? colors.primary : colors.borderStrong }]}>
                    <Text style={[styles.countText, { color: active ? colors.textInverse : colors.textSecondary }]}>
                      {unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Não foi possível carregar"
              description={error}
              actionLabel="Tentar novamente"
              onAction={load}
            />
          ) : filter === 'unread' ? (
            <EmptyState
              icon="checkmark-done-outline"
              title="Tudo em dia"
              description="Nenhuma notificação não lida por aqui."
            />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="Nenhuma notificação"
              description="Avisos de escalas, presença e aniversários aparecerão aqui."
            />
          )
        }
        renderItem={({ item }) => {
          const unread = !item.read_at;
          return (
            <TouchableOpacity
              style={[styles.item, unread && styles.itemUnread]}
              onPress={() => openNotification(item)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}${unread ? ', não lida' : ''}`}
            >
              <View style={[styles.iconCircle, unread && styles.iconCircleUnread]}>
                <Ionicons
                  name={notificationIcon(item.type)}
                  size={18}
                  color={unread ? colors.text : colors.textMuted}
                />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTopRow}>
                  <Text
                    style={[styles.itemTitle, unread && styles.itemTitleUnread]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.itemTime} numberOfLines={1}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
                {item.body ? (
                  <Text style={styles.itemBody} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
              </View>
              {unread ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
      alignSelf: 'flex-start',
    },
    actionText: { ...typography.label, color: colors.text, fontWeight: '600' },
    filterWrap: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    segmentTrack: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.full,
      padding: 3,
      gap: 2,
    },
    segment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
    },
    segmentActive: {
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    segmentText: { ...typography.label, fontWeight: '600' },
    countPill: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: { fontSize: 11, fontWeight: '700' },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
    sectionTitle: {
      ...typography.tiny,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      marginBottom: 2,
    },
    itemUnread: {
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
    },
    iconCircleUnread: {
      backgroundColor: colors.primaryMuted,
    },
    itemContent: { flex: 1, minWidth: 0 },
    itemTopRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    itemTitle: { ...typography.body, color: colors.textSecondary, flex: 1 },
    itemTitleUnread: { ...typography.bodyMedium, color: colors.text, fontWeight: '700' },
    itemTime: { ...typography.small, color: colors.textMuted },
    itemBody: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 6,
    },
  });
}
