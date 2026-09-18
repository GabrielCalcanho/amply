import { supabase } from '../services/supabase';
import type { NotificationType } from '../types';

/** Create in-app notifications for one or more users (same church). */
export async function notifyUsers(params: {
  churchId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}) {
  const ids = [...new Set(params.userIds.filter(Boolean))];
  if (!ids.length) return { error: null };
  const rows = ids.map((user_id) => ({
    church_id: params.churchId,
    user_id,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    data: params.data ?? {},
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  return { error };
}

/** Notify all members of a church (except optional excludeUserId). */
export async function notifyChurchMembers(params: {
  churchId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  excludeUserId?: string;
}) {
  const { data, error } = await supabase
    .from('church_members')
    .select('user_id')
    .eq('church_id', params.churchId);
  if (error) return { error };
  const userIds = (data ?? [])
    .map((r: { user_id: string }) => r.user_id)
    .filter((id: string) => id && id !== params.excludeUserId);
  return notifyUsers({
    churchId: params.churchId,
    userIds,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data,
  });
}
