import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { TabScreenShell } from '../components/layout/TabScreenShell';
import { AppHeader } from '../components/layout/AppHeader';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { SearchField } from '../components/SearchField';
import { spacing, radius, shadow, typography } from '../constants/theme';
import { ConversationSummary, ChurchMember } from '../types';
import { formatDayMonth, formatTime } from '../utils/dates';
import { setTotalUnread } from '../utils/unreadStore';
import { formatSupabaseError } from '../utils/payload';

type MemberOption = { user_id: string; name: string; avatar_url: string | null; instrument: string | null };

function conversationLabel(c: ConversationSummary): string {
  if (c.type === 'ministry') return c.title || 'Chat geral';
  if (c.type === 'direct') return c.other_user_name || 'Conversa';
  return c.title || 'Chat da escala';
}

function previewTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(d.toISOString().slice(11, 16));
  return formatDayMonth(iso);
}

export function MessagesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { church, user } = useAuth();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const load = useCallback(async () => {
    if (!church) return;
    setLoading(true);
    setError(null);
    // Garante que o chat geral exista (idempotente)
    await supabase.rpc('get_or_create_ministry_conversation');
    const { data, error: rpcError } = await supabase.rpc('list_conversation_summaries');
    if (rpcError) {
      setError(formatSupabaseError(rpcError));
      setItems([]);
    } else {
      const list = (data as ConversationSummary[]) ?? [];
      setItems(list);
      setTotalUnread(list.reduce((acc, c) => acc + (c.unread_count || 0), 0));
    }
    setLoading(false);
  }, [church]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openPicker = async () => {
    setPickerVisible(true);
    setPickerLoading(true);
    const { data } = await supabase
      .from('church_members')
      .select('*, profile:profiles(id, name, avatar_url)')
      .eq('church_id', church!.id)
      .eq('is_active', true);
    const options = ((data as ChurchMember[]) ?? [])
      .filter((m) => m.user_id !== user?.id)
      .map((m) => ({
        user_id: m.user_id,
        name: m.profile?.name ?? 'Usuário',
        avatar_url: m.profile?.avatar_url ?? null,
        instrument: m.instrument ?? null,
      }));
    setMemberOptions(options);
    setPickerLoading(false);
  };

  const openDirect = async (otherUserId: string, name: string) => {
    setPickerVisible(false);
    const { data, error: rpcError } = await supabase.rpc('get_or_create_direct_conversation', {
      p_other_user: otherUserId,
    });
    if (rpcError || !data) {
      setError(formatSupabaseError(rpcError!));
      return;
    }
    navigation.navigate('Chat', { conversationId: data as string, title: name });
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return memberOptions;
    return memberOptions.filter((m) => m.name.toLowerCase().includes(q));
  }, [memberOptions, memberSearch]);

  const openConversation = (c: ConversationSummary) => {
    navigation.navigate('Chat', { conversationId: c.id, title: conversationLabel(c) });
  };

  const iconFor = (c: ConversationSummary): keyof typeof Ionicons.glyphMap => {
    if (c.type === 'ministry') return 'people';
    if (c.type === 'setlist') return 'calendar';
    return 'chatbubble';
  };

  return (
    <TabScreenShell>
      <AppHeader
        title="Mensagens"
        showNotifications={false}
        showAvatar={false}
        right={
          <Pressable
            onPress={openPicker}
            hitSlop={10}
            accessibilityLabel="Nova conversa"
          >
            <Ionicons name="create-outline" size={24} color={colors.text} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={load}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Nenhuma conversa ainda"
              description="O chat geral aparece aqui. Toque em + para conversar com um membro."
            />
          }
          renderItem={({ item }) => {
            const unread = item.unread_count > 0;
            return (
              <Pressable
                onPress={() => openConversation(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.xl,
                    opacity: pressed ? 0.92 : 1,
                    ...shadow.sm,
                  },
                ]}
              >
                {item.type === 'direct' ? (
                  <Avatar uri={item.other_user_avatar} name={item.other_user_name} size={48} />
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name={iconFor(item)} size={22} color={colors.text} />
                  </View>
                )}
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[styles.name, { color: colors.text }, unread && styles.nameUnread]}
                      numberOfLines={1}
                    >
                      {conversationLabel(item)}
                    </Text>
                    <Text style={[styles.time, { color: colors.textMuted }]}>
                      {previewTime(item.last_message_at)}
                    </Text>
                  </View>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.preview,
                        { color: unread ? colors.text : colors.textSecondary },
                        unread && styles.nameUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.last_message_body
                        ? `${item.type !== 'direct' && item.last_message_sender ? `${item.last_message_sender}: ` : ''}${item.last_message_body}`
                        : 'Sem mensagens ainda'}
                    </Text>
                    {unread ? (
                      <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                        <Text style={[styles.badgeText, { color: colors.textInverse }]}>
                          {item.unread_count > 99 ? '99+' : item.unread_count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setPickerVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Nova conversa</Text>
            <SearchField
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Buscar membro..."
            />
            {pickerLoading ? (
              <View style={styles.centerSmall}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={(m) => m.user_id}
                style={{ maxHeight: 360 }}
                ListEmptyComponent={
                  <Text style={[styles.emptyMembers, { color: colors.textMuted }]}>
                    Nenhum membro encontrado.
                  </Text>
                }
                renderItem={({ item: m }) => (
                  <Pressable
                    style={styles.memberRow}
                    onPress={() => openDirect(m.user_id, m.name)}
                  >
                    <Avatar uri={m.avatar_url} name={m.name} size={40} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                        {m.name}
                      </Text>
                      {m.instrument ? (
                        <Text style={[styles.memberMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {m.instrument}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerSmall: { paddingVertical: spacing.xl, alignItems: 'center' },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.body, fontWeight: '600', flex: 1 },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 12 },
  preview: { fontSize: 13, marginTop: 2, flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberMeta: { fontSize: 13, marginTop: 1 },
  emptyMembers: { ...typography.body, paddingVertical: spacing.lg, textAlign: 'center' },
});
