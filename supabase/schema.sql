-- AMPLY Database Schema
-- Multi-tenant architecture with Row Level Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Churches / Ministries
CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  invite_code TEXT UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Church members (multi-tenant membership)
CREATE TABLE public.church_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'leader', 'musician')),
  instrument TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, user_id)
);

-- Songs
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  key TEXT,
  bpm INTEGER,
  capo INTEGER,
  notes TEXT,
  album TEXT,
  spotify_track_id TEXT,
  spotify_url TEXT,
  artwork_url TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setlists (escalas)
CREATE TABLE public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setlist songs (ordered repertoire)
CREATE TABLE public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE (setlist_id, song_id)
);

-- Setlist members (scheduled musicians)
CREATE TABLE public.setlist_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (setlist_id, user_id)
);

-- Song materials
CREATE TABLE public.song_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('youtube', 'spotify', 'external_link', 'pdf', 'chord', 'note')),
  title TEXT NOT NULL,
  url TEXT,
  content TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personal user notes on songs
CREATE TABLE public.user_song_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, song_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_church_members_user ON public.church_members(user_id);
CREATE INDEX idx_church_members_church ON public.church_members(church_id);
CREATE INDEX idx_songs_church ON public.songs(church_id);
CREATE INDEX idx_setlists_church ON public.setlists(church_id);
CREATE INDEX idx_setlists_date ON public.setlists(date);
CREATE INDEX idx_setlist_songs_setlist ON public.setlist_songs(setlist_id);
CREATE INDEX idx_setlist_members_setlist ON public.setlist_members(setlist_id);
CREATE INDEX idx_song_materials_song ON public.song_materials(song_id);
CREATE INDEX idx_user_song_notes_user ON public.user_song_notes(user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is member of a church
CREATE OR REPLACE FUNCTION public.is_church_member(p_church_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.church_members
    WHERE church_id = p_church_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has role in church (owner or leader)
CREATE OR REPLACE FUNCTION public.has_church_role(p_church_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.church_members
    WHERE church_id = p_church_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get church_id of a song
CREATE OR REPLACE FUNCTION public.get_song_church_id(p_song_id UUID)
RETURNS UUID AS $$
  SELECT church_id FROM public.songs WHERE id = p_song_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get church_id of a setlist
CREATE OR REPLACE FUNCTION public.get_setlist_church_id(p_setlist_id UUID)
RETURNS UUID AS $$
  SELECT church_id FROM public.setlists WHERE id = p_setlist_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Lookup church by invite code (for joining without being a member yet)
CREATE OR REPLACE FUNCTION public.find_church_by_invite(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT) AS $$
  SELECT id, name FROM public.churches
  WHERE invite_code = upper(trim(p_code));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create church + owner membership atomically
CREATE OR REPLACE FUNCTION public.create_church_with_owner(p_name TEXT)
RETURNS public.churches AS $$
DECLARE
  new_church public.churches;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.churches (name) VALUES (p_name) RETURNING * INTO new_church;
  INSERT INTO public.church_members (church_id, user_id, role)
  VALUES (new_church.id, auth.uid(), 'owner');
  RETURN new_church;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join church by invite code (validates code server-side)
CREATE OR REPLACE FUNCTION public.join_church_by_invite(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  cid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO cid FROM public.churches WHERE invite_code = upper(trim(p_code));
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO public.church_members (church_id, user_id, role)
  VALUES (cid, auth.uid(), 'musician')
  ON CONFLICT (church_id, user_id) DO NOTHING;
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER churches_updated_at BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER songs_updated_at BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER setlists_updated_at BEFORE UPDATE ON public.setlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER song_materials_updated_at BEFORE UPDATE ON public.song_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_song_notes_updated_at BEFORE UPDATE ON public.user_song_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_song_notes ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of same church members"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.church_members cm1
      JOIN public.church_members cm2 ON cm1.church_id = cm2.church_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
    )
  );

-- CHURCHES
CREATE POLICY "Members can view their churches"
  ON public.churches FOR SELECT
  USING (public.is_church_member(id));

CREATE POLICY "Authenticated users can create churches"
  ON public.churches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their church"
  ON public.churches FOR UPDATE
  USING (public.has_church_role(id, ARRAY['owner']));

CREATE POLICY "Owners can delete their church"
  ON public.churches FOR DELETE
  USING (public.has_church_role(id, ARRAY['owner']));

-- CHURCH_MEMBERS
CREATE POLICY "Members can view church members"
  ON public.church_members FOR SELECT
  USING (public.is_church_member(church_id));

CREATE POLICY "Owners and leaders can insert members"
  ON public.church_members FOR INSERT
  WITH CHECK (
    public.has_church_role(church_id, ARRAY['owner', 'leader'])
    OR (
      -- First member (owner) when church has no members yet
      NOT EXISTS (SELECT 1 FROM public.church_members WHERE church_id = church_members.church_id)
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );
-- Join via invite MUST use RPC join_church_by_invite (SECURITY DEFINER).
-- Direct self-insert as musician is not allowed (prevents joining arbitrary churches by church_id).

CREATE POLICY "Owners and leaders can update members"
  ON public.church_members FOR UPDATE
  USING (public.has_church_role(church_id, ARRAY['owner', 'leader']));

CREATE POLICY "Owners and leaders can delete members"
  ON public.church_members FOR DELETE
  USING (
    public.has_church_role(church_id, ARRAY['owner', 'leader'])
    AND user_id != auth.uid() -- cannot remove self this way
  );

CREATE POLICY "Members can leave church"
  ON public.church_members FOR DELETE
  USING (user_id = auth.uid() AND role != 'owner');

-- SONGS
CREATE POLICY "Members can view songs of their church"
  ON public.songs FOR SELECT
  USING (public.is_church_member(church_id));

CREATE POLICY "Members can create songs"
  ON public.songs FOR INSERT
  WITH CHECK (public.is_church_member(church_id) AND created_by = auth.uid());

CREATE POLICY "Members can update songs"
  ON public.songs FOR UPDATE
  USING (public.is_church_member(church_id));

CREATE POLICY "Owners and leaders can delete songs"
  ON public.songs FOR DELETE
  USING (public.has_church_role(church_id, ARRAY['owner', 'leader']));

-- SETLISTS
CREATE POLICY "Members can view setlists of their church"
  ON public.setlists FOR SELECT
  USING (public.is_church_member(church_id));

CREATE POLICY "Leaders and owners can create setlists"
  ON public.setlists FOR INSERT
  WITH CHECK (
    public.has_church_role(church_id, ARRAY['owner', 'leader'])
    AND created_by = auth.uid()
  );

CREATE POLICY "Leaders and owners can update setlists"
  ON public.setlists FOR UPDATE
  USING (public.has_church_role(church_id, ARRAY['owner', 'leader']));

CREATE POLICY "Leaders and owners can delete setlists"
  ON public.setlists FOR DELETE
  USING (public.has_church_role(church_id, ARRAY['owner', 'leader']));

-- SETLIST_SONGS
CREATE POLICY "Members can view setlist songs"
  ON public.setlist_songs FOR SELECT
  USING (public.is_church_member(public.get_setlist_church_id(setlist_id)));

CREATE POLICY "Leaders and owners can insert setlist songs"
  ON public.setlist_songs FOR INSERT
  WITH CHECK (public.has_church_role(public.get_setlist_church_id(setlist_id), ARRAY['owner', 'leader']));

CREATE POLICY "Leaders and owners can update setlist songs"
  ON public.setlist_songs FOR UPDATE
  USING (public.has_church_role(public.get_setlist_church_id(setlist_id), ARRAY['owner', 'leader']));

CREATE POLICY "Leaders and owners can delete setlist songs"
  ON public.setlist_songs FOR DELETE
  USING (public.has_church_role(public.get_setlist_church_id(setlist_id), ARRAY['owner', 'leader']));

-- SETLIST_MEMBERS
CREATE POLICY "Members can view setlist members"
  ON public.setlist_members FOR SELECT
  USING (public.is_church_member(public.get_setlist_church_id(setlist_id)));

CREATE POLICY "Leaders and owners can manage setlist members"
  ON public.setlist_members FOR INSERT
  WITH CHECK (public.has_church_role(public.get_setlist_church_id(setlist_id), ARRAY['owner', 'leader']));

CREATE POLICY "Leaders and owners can update setlist members"
  ON public.setlist_members FOR UPDATE
  USING (public.has_church_role(public.get_setlist_church_id(setlist_id), ARRAY['owner', 'leader']));

CREATE POLICY "Leaders and owners can delete setlist members"
  ON public.setlist_members FOR DELETE
  USING (public.has_church_role(public.get_setlist_church_id(setlist_id), ARRAY['owner', 'leader']));

CREATE POLICY "Users can update own status"
  ON public.setlist_members FOR UPDATE
  USING (user_id = auth.uid());

-- SONG_MATERIALS
CREATE POLICY "Members can view song materials"
  ON public.song_materials FOR SELECT
  USING (public.is_church_member(public.get_song_church_id(song_id)));

CREATE POLICY "Members can create song materials"
  ON public.song_materials FOR INSERT
  WITH CHECK (
    public.is_church_member(public.get_song_church_id(song_id))
    AND created_by = auth.uid()
  );

CREATE POLICY "Members can update song materials"
  ON public.song_materials FOR UPDATE
  USING (public.is_church_member(public.get_song_church_id(song_id)));

CREATE POLICY "Owners and leaders can delete song materials"
  ON public.song_materials FOR DELETE
  USING (public.has_church_role(public.get_song_church_id(song_id), ARRAY['owner', 'leader']));

-- USER_SONG_NOTES (personal only)
CREATE POLICY "Users can manage own song notes"
  ON public.user_song_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STORAGE (for logos, PDFs, etc.)
-- =====================================================
-- Run these in Supabase dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('church-logos', 'church-logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('song-pdfs', 'song-pdfs', false);


-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
