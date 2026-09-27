import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { spacing, radius, typography } from '../constants/theme';
import { ChatMessage } from '../types';
import { formatTime, formatDayMonth } from '../utils/dates';
import { formatSupabaseError } from '../utils/payload';

const PAGE_SIZE = 30;

type UiMessage = ChatMessage & { pending?: boolean; failed?: boolean };

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const conversationId = route.params?.conversationId as string;
  const title = (route.params?.title as string) || 'Conversa';
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const oldestRef = useRef<string | null>(null);

  const markRead = useCallback(() => {
    supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId }).then();
  }, [conversationId]);

  const fetchPage = useCallback(
    async (before?: string) => {
      let query = supabase
        .from('messages')
        .select('*, sender:profiles(name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (before) query = query.lt('created_at', before);
      const { data, error: qError } = await query;
      if (qError) {
        setError(formatSupabaseError(qError));
        return [];
      }
      const rows = ((data as ChatMessage[]) ?? []).slice().reverse();
      if (rows.length < PAGE_SIZE) setHasMore(false);
      if (rows.length > 0) oldestRef.current = rows[0].created_at;
      return rows;
    },
    [conversationId]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const rows = await fetchPage();
      if (!mounted) return;
      setMessages(rows);
      setLoading(false);
      markRead();
    })();

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          if (!row.sender) {
            const { data } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', row.sender_id)
              .maybeSingle();
            if (data) {
              setMessages((prev) =>
                prev.map((m) => (m.id === row.id ? { ...m, sender: data as any } : m))
              );
            }
          }
          markRead();
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, fetchPage, markRead]);

  const loadOlder = async () => {
    if (loadingMore || !hasMore || !oldestRef.current) return;
    setLoadingMore(true);
    const rows = await fetchPage(oldestRef.current);
    setMessages((prev) => [...rows, ...prev]);
    setLoadingMore(false);
  };

  const send = async (bodyOverride?: string) => {
    const body = (bodyOverride ?? draft).trim();
    if (!body || !user || sending) return;
    setSending(true);
    setError(null);
    const tempId = `temp-${Date.now()}`;
    const optimistic: UiMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      body,
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      sender: { name: profile?.name ?? null, avatar_url: profile?.avatar_url ?? null },
      pending: true,
    };
    setDraft('');
    setMessages((prev) => [...prev, optimistic]);

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, body })
      .select('*, sender:profiles(name, avatar_url)')
      .single();

    if (insertError) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      setError('Não foi possível enviar. Toque na mensagem para tentar novamente.');
    } else {
      const saved = data as ChatMessage;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      markRead();
    }
    setSending(false);
  };

  const retry = async (m: UiMessage) => {
    if (!m.failed || !user) return;
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    send(m.body);
  };

  const renderDay = (iso: string) => formatDayMonth(iso.slice(0, 10));

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScreenHeader title={title} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.15}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.moreWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Nenhuma mensagem ainda. Diga olá!
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_id === user?.id;
            const prev = messages[index - 1];
            const showDay =
              !prev || prev.created_at.slice(0, 10) !== item.created_at.slice(0, 10);
            const removed = !!item.deleted_at;
            return (
              <View>
                {showDay ? (
                  <View style={styles.dayWrap}>
                    <Text style={[styles.dayText, { color: colors.textMuted, backgroundColor: colors.surfaceSecondary }]}>
                      {renderDay(item.created_at)}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  disabled={!item.failed}
                  onPress={() => retry(item)}
                  style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}
                >
                  {!mine && item.sender ? (
                    <Avatar
                      uri={item.sender.avatar_url}
                      name={item.sender.name}
                      size={28}
                      style={{ marginRight: spacing.xs, marginBottom: 2 }}
                    />
                  ) : null}
                  <View style={{ flexShrink: 1 }}>
                    {!mine && item.sender?.name && !removed ? (
                      <Text style={[styles.senderName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.sender.name}
                      </Text>
                    ) : null}
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
                        item.failed && { borderColor: colors.danger, borderWidth: 1.5 },
                      ]}
                    >
                      <Text style={[styles.body, mine ? { color: colors.textInverse } : { color: colors.text }]}>
                        {removed ? 'Mensagem removida' : item.body}
                      </Text>
                      <View style={[styles.metaRow, mine && styles.metaRowMine]}>
                        {item.pending ? (
                          <ActivityIndicator size="small" color={mine ? colors.textInverse : colors.primary} />
                        ) : null}
                        {item.failed ? (
                          <Ionicons name="alert-circle" size={13} color={colors.danger} />
                        ) : null}
                        <Text style={[styles.time, mine ? { color: colors.textInverse } : { color: colors.textMuted }]}>
                          {formatTime(item.created_at.slice(11, 16))}
                        </Text>
                      </View>
                    </View>
                    {item.failed ? (
                      <Text style={[styles.retryHint, { color: colors.danger }]}>
                        Falhou — toque para reenviar
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
        {error ? (
          <View style={[styles.errorBar, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
          />
          <Pressable
            onPress={() => send()}
            disabled={!draft.trim() || sending}
            hitSlop={6}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: draft.trim() && !sending ? colors.primary : colors.surfaceSecondary,
                borderWidth: draft.trim() && !sending ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.borderStrong,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityLabel="Enviar mensagem"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Ionicons name="send" size={18} color={draft.trim() ? colors.textInverse : colors.textMuted} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  list: { padding: spacing.md, paddingBottom: spacing.sm, flexGrow: 1 },
  moreWrap: { paddingVertical: spacing.sm, alignItems: 'center' },
  emptyText: { ...typography.body, textAlign: 'center' },
  dayWrap: { alignItems: 'center', marginVertical: spacing.sm },
  dayText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  senderName: { fontSize: 12, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    maxWidth: '100%',
  },
  body: { fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 },
  metaRowMine: { justifyContent: 'flex-end' },
  time: { fontSize: 11, opacity: 0.85 },
  retryHint: { fontSize: 11, marginTop: 2, marginLeft: 4 },
  errorBar: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  errorText: { fontSize: 13, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
