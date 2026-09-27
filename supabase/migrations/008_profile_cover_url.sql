-- Profile cover image (horizontal banner behind avatar)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Ensure avatars bucket can hold covers too (same public bucket, path {userId}/cover.*)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = GREATEST(storage.buckets.file_size_limit, 5242880);

NOTIFY pgrst, 'reload schema';
