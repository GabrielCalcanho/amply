-- Profile birth date for birthdays
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Song: ministry fields + Spotify reference metadata (CDN URLs only, not re-hosted)
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS capo INTEGER,
  ADD COLUMN IF NOT EXISTS spotify_track_id TEXT,
  ADD COLUMN IF NOT EXISTS spotify_url TEXT,
  ADD COLUMN IF NOT EXISTS album TEXT,
  ADD COLUMN IF NOT EXISTS artwork_url TEXT;

CREATE INDEX IF NOT EXISTS idx_songs_spotify_track ON public.songs(spotify_track_id);

-- Storage bucket for user avatars (user-uploaded only)
-- Run in dashboard if needed:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;
