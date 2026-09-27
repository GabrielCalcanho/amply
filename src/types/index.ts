export type UserRole = 'owner' | 'leader' | 'musician';

export type MaterialType = 'youtube' | 'spotify' | 'external_link' | 'pdf' | 'chord' | 'note';

export type MemberStatus = 'pending' | 'confirmed' | 'declined';

export type SetlistStatus = 'draft' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export const SETLIST_STATUS_LABELS: Record<SetlistStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Não poderá participar',
};

export const INSTRUMENT_SUGGESTIONS = [
  'Vocal',
  'Violão',
  'Guitarra',
  'Baixo',
  'Teclado',
  'Bateria',
  'Cajón',
  'Sonoplastia',
  'Mídia',
  'Líder de louvor',
  'Regência',
  'Outro',
] as const;

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  /** Horizontal cover image behind avatar on Profile */
  cover_url?: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Church {
  id: string;
  name: string;
  logo_url: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface ChurchMember {
  id: string;
  church_id: string;
  user_id: string;
  role: UserRole;
  instrument: string | null;
  is_active?: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Song {
  id: string;
  church_id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  notes: string | null;
  capo: number | null;
  album: string | null;
  category: string | null;
  is_favorite: boolean;
  /** Reserved for future Spotify integration */
  spotify_track_id: string | null;
  spotify_url: string | null;
  artwork_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setlist {
  id: string;
  church_id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  notes: string | null;
  status: SetlistStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  songs_count?: number;
  members_count?: number;
}

export interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  notes: string | null;
  song?: Song;
}

export interface SetlistMember {
  id: string;
  setlist_id: string;
  user_id: string;
  instrument: string | null;
  status: MemberStatus;
  created_at: string;
  profile?: Profile;
}

export interface SongMaterial {
  id: string;
  song_id: string;
  type: MaterialType;
  title: string;
  url: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSongNote {
  id: string;
  user_id: string;
  song_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'setlist_new'
  | 'setlist_updated'
  | 'presence_pending'
  | 'birthday'
  | 'admin_notice'
  | 'announcement'
  | 'message';

export interface NotificationItem {
  id: string;
  church_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type ConversationType = 'ministry' | 'direct' | 'setlist';

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  title: string | null;
  setlist_id: string | null;
  setlist_date: string | null;
  other_user_id: string | null;
  other_user_name: string | null;
  other_user_avatar: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_sender: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender?: { name: string | null; avatar_url: string | null } | null;
}
