-- 011: Chat core — conversas (geral do ministério, DMs e por escala), mensagens,
-- não-lidas, notificações de mensagem e realtime.
-- Multi-tenant: tudo isolado por church_id. Idempotente.

-- =====================================================
-- TABELAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ministry', 'direct', 'setlist')),
  setlist_id UUID REFERENCES public.setlists(id) ON DELETE CASCADE,
  member_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (type <> 'setlist' OR setlist_id IS NOT NULL),
  CHECK (type <> 'direct' OR (member_a IS NOT NULL AND member_b IS NOT NULL)),
  CHECK (type <> 'direct' OR member_a < member_b)
);

CREATE INDEX IF NOT EXISTS idx_conversations_church ON public.conversations(church_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_ministry
  ON public.conversations(church_id) WHERE type = 'ministry';
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_direct
  ON public.conversations(member_a, member_b) WHERE type = 'direct';
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_setlist
  ON public.conversations(setlist_id) WHERE type = 'setlist';

-- Participação/leitura (last_read_at é a fonte das não-lidas)
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON public.conversation_members(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);

-- =====================================================
-- HELPERS DE ACESSO
-- =====================================================

-- Quem pode acessar uma conversa:
--   ministry → qualquer membro da igreja
--   direct   → os dois participantes
--   setlist  → membros da igreja escalados (ou líderes/owner)
CREATE OR REPLACE FUNCTION public.can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT c.type, c.church_id, c.setlist_id, c.member_a, c.member_b
    INTO v
  FROM public.conversations c
  WHERE c.id = p_conversation_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v.type = 'ministry' THEN
    RETURN public.is_church_member(v.church_id);
  END IF;

  IF v.type = 'direct' THEN
    RETURN v.member_a = auth.uid() OR v.member_b = auth.uid();
  END IF;

  -- setlist
  IF NOT public.is_church_member(v.church_id) THEN
    RETURN false;
  END IF;
  RETURN public.has_church_role(v.church_id, ARRAY['owner', 'leader'])
      OR EXISTS (
           SELECT 1 FROM public.setlist_members sm
           WHERE sm.setlist_id = v.setlist_id AND sm.user_id = auth.uid()
         );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view accessible conversations" ON public.conversations;
CREATE POLICY "Members view accessible conversations"
  ON public.conversations FOR SELECT
  USING (public.can_access_conversation(id));

-- Criação/alteração só pelas RPCs (SECURITY DEFINER); sem políticas de escrita.

DROP POLICY IF EXISTS "Users manage own conversation membership" ON public.conversation_members;
CREATE POLICY "Users manage own conversation membership"
  ON public.conversation_members FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
CREATE POLICY "Participants read messages"
  ON public.messages FOR SELECT
  USING (public.can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_conversation(conversation_id)
  );

DROP POLICY IF EXISTS "Senders update own messages" ON public.messages;
CREATE POLICY "Senders update own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Senders delete own messages" ON public.messages;
CREATE POLICY "Senders delete own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- =====================================================
-- RPCs
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_or_create_ministry_conversation()
RETURNS UUID AS $$
DECLARE
  v_church UUID;
  v_id UUID;
BEGIN
  SELECT church_id INTO v_church
  FROM public.church_members
  WHERE user_id = auth.uid() AND is_active
  LIMIT 1;
  IF v_church IS NULL THEN
    RAISE EXCEPTION 'Usuário não pertence a uma igreja';
  END IF;

  SELECT id INTO v_id FROM public.conversations
  WHERE church_id = v_church AND type = 'ministry';

  IF v_id IS NULL THEN
    INSERT INTO public.conversations (church_id, type, title)
    VALUES (v_church, 'ministry', 'Chat geral')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.conversations
      WHERE church_id = v_church AND type = 'ministry';
    END IF;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user UUID)
RETURNS UUID AS $$
DECLARE
  v_church UUID;
  v_a UUID;
  v_b UUID;
  v_id UUID;
BEGIN
  IF p_other_user = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível conversar consigo mesmo';
  END IF;

  SELECT church_id INTO v_church
  FROM public.church_members
  WHERE user_id = auth.uid() AND is_active
  LIMIT 1;
  IF v_church IS NULL THEN
    RAISE EXCEPTION 'Usuário não pertence a uma igreja';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.church_members
    WHERE church_id = v_church AND user_id = p_other_user AND is_active
  ) THEN
    RAISE EXCEPTION 'Destinatário não pertence à mesma igreja';
  END IF;

  v_a := LEAST(auth.uid(), p_other_user);
  v_b := GREATEST(auth.uid(), p_other_user);

  SELECT id INTO v_id FROM public.conversations
  WHERE type = 'direct' AND member_a = v_a AND member_b = v_b;

  IF v_id IS NULL THEN
    INSERT INTO public.conversations (church_id, type, member_a, member_b)
    VALUES (v_church, 'direct', v_a, v_b)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.conversations
      WHERE type = 'direct' AND member_a = v_a AND member_b = v_b;
    END IF;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_id, auth.uid()), (v_id, p_other_user)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_or_create_setlist_conversation(p_setlist_id UUID)
RETURNS UUID AS $$
DECLARE
  v_church UUID;
  v_title TEXT;
  v_id UUID;
BEGIN
  SELECT church_id, title INTO v_church, v_title
  FROM public.setlists WHERE id = p_setlist_id;
  IF v_church IS NULL THEN
    RAISE EXCEPTION 'Escala não encontrada';
  END IF;
  IF NOT public.is_church_member(v_church) THEN
    RAISE EXCEPTION 'Usuário não pertence a esta igreja';
  END IF;

  SELECT id INTO v_id FROM public.conversations
  WHERE type = 'setlist' AND setlist_id = p_setlist_id;

  IF v_id IS NULL THEN
    INSERT INTO public.conversations (church_id, type, setlist_id, title)
    VALUES (v_church, 'setlist', p_setlist_id, v_title)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.conversations
      WHERE type = 'setlist' AND setlist_id = p_setlist_id;
    END IF;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.can_access_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Sem acesso à conversa';
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, auth.uid(), NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Lista de conversas do usuário com última mensagem e não-lidas (1 round-trip)
CREATE OR REPLACE FUNCTION public.list_conversation_summaries()
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  setlist_id UUID,
  setlist_date DATE,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  last_message_body TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender TEXT,
  unread_count BIGINT
) AS $$
DECLARE
  v_church UUID;
BEGIN
  SELECT church_id INTO v_church
  FROM public.church_members
  WHERE user_id = auth.uid() AND is_active
  LIMIT 1;
  IF v_church IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.type,
    c.title,
    c.setlist_id,
    sl.date AS setlist_date,
    other.id AS other_user_id,
    other.name AS other_user_name,
    other.avatar_url AS other_user_avatar,
    lm.body AS last_message_body,
    lm.created_at AS last_message_at,
    lm_sender.name AS last_message_sender,
    COALESCE((
      SELECT COUNT(*)
      FROM public.messages m2
      WHERE m2.conversation_id = c.id
        AND m2.deleted_at IS NULL
        AND m2.sender_id <> auth.uid()
        AND m2.created_at > COALESCE(cm.last_read_at, '-infinity'::timestamptz)
    ), 0) AS unread_count
  FROM public.conversations c
  LEFT JOIN public.setlists sl ON sl.id = c.setlist_id
  LEFT JOIN LATERAL (
    SELECT p.id, p.name, p.avatar_url
    FROM public.profiles p
    WHERE c.type = 'direct'
      AND p.id = CASE WHEN c.member_a = auth.uid() THEN c.member_b ELSE c.member_a END
  ) other ON true
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_id
    FROM public.messages m
    WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN public.profiles lm_sender ON lm_sender.id = lm.sender_id
  LEFT JOIN public.conversation_members cm
    ON cm.conversation_id = c.id AND cm.user_id = auth.uid()
  WHERE c.church_id = v_church
    AND (
      c.type = 'ministry'
      OR (c.type = 'direct' AND (c.member_a = auth.uid() OR c.member_b = auth.uid()))
      OR (c.type = 'setlist' AND (
            public.has_church_role(v_church, ARRAY['owner', 'leader'])
         OR EXISTS (
              SELECT 1 FROM public.setlist_members sm
              WHERE sm.setlist_id = c.setlist_id AND sm.user_id = auth.uid()
            )
      ))
    )
  ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- =====================================================
-- NOTIFICAÇÕES DE MENSAGEM (DM + chat de escala)
-- =====================================================

-- O nome da constraint pode variar conforme como foi aplicada; remove qualquer
-- CHECK sobre "type" antes de recriar com os tipos atuais usados pelo app.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'setlist_new',
  'setlist_updated',
  'presence_pending',
  'birthday',
  'admin_notice',
  'announcement',
  'message'
));

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conv RECORD;
  v_sender_name TEXT;
BEGIN
  SELECT c.type, c.church_id, c.setlist_id, c.member_a, c.member_b, c.title
    INTO v_conv
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  -- Chat geral não notifica (apenas badge de não-lidas)
  IF v_conv.type = 'ministry' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

  IF v_conv.type = 'direct' THEN
    INSERT INTO public.notifications (church_id, user_id, type, title, body, data)
    SELECT
      v_conv.church_id,
      CASE WHEN v_conv.member_a = NEW.sender_id THEN v_conv.member_b ELSE v_conv.member_a END,
      'message',
      COALESCE(v_sender_name, 'Nova mensagem'),
      left(NEW.body, 140),
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id);
  ELSIF v_conv.type = 'setlist' THEN
    INSERT INTO public.notifications (church_id, user_id, type, title, body, data)
    SELECT DISTINCT
      v_conv.church_id,
      sm.user_id,
      'message',
      COALESCE(v_sender_name, 'Nova mensagem') || ' · ' || COALESCE(v_conv.title, 'Escala'),
      left(NEW.body, 140),
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    FROM public.setlist_members sm
    WHERE sm.setlist_id = v_conv.setlist_id
      AND sm.user_id <> NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS messages_notify ON public.messages;
CREATE TRIGGER messages_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- =====================================================
-- REALTIME
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
