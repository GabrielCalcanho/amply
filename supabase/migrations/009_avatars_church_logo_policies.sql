-- ============================================================
-- 008_avatars_church_logo_policies.sql
-- Policies for ministry/church logo upload inside bucket "avatars"
-- Path convention used by the app: churches/{church_id}/logo.{ext}
-- Safe to run multiple times (DROP IF EXISTS + CREATE).
-- ============================================================

-- 1) Ensure the avatars bucket exists and is public (for getPublicUrl)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = COALESCE(storage.buckets.file_size_limit, 5242880),
  allowed_mime_types = COALESCE(
    storage.buckets.allowed_mime_types,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  );

-- 2) Policies specifically for church logos under avatars/churches/{church_id}/...
--    We do NOT open the whole bucket for arbitrary uploads.

-- Public read (bucket is public; logo must be displayable without auth)
DROP POLICY IF EXISTS "avatars_church_logos_public_read" ON storage.objects;
CREATE POLICY "avatars_church_logos_public_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'churches'
  );

-- Authenticated owner/leader of THAT church can INSERT
DROP POLICY IF EXISTS "avatars_church_logos_insert" ON storage.objects;
CREATE POLICY "avatars_church_logos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'churches'
    AND EXISTS (
      SELECT 1
      FROM public.church_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'leader')
        AND cm.church_id::text = (storage.foldername(name))[2]
    )
  );

-- Authenticated owner/leader of THAT church can UPDATE (upsert)
DROP POLICY IF EXISTS "avatars_church_logos_update" ON storage.objects;
CREATE POLICY "avatars_church_logos_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'churches'
    AND EXISTS (
      SELECT 1
      FROM public.church_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'leader')
        AND cm.church_id::text = (storage.foldername(name))[2]
    )
  );

-- Authenticated owner/leader of THAT church can DELETE
DROP POLICY IF EXISTS "avatars_church_logos_delete" ON storage.objects;
CREATE POLICY "avatars_church_logos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'churches'
    AND EXISTS (
      SELECT 1
      FROM public.church_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'leader')
        AND cm.church_id::text = (storage.foldername(name))[2]
    )
  );

-- 3) Also keep/ensure basic profile avatar policies under avatars/{user_id}/...
--    (so profile photo continues to work; does not open the whole bucket)

DROP POLICY IF EXISTS "avatars_profile_public_read" ON storage.objects;
CREATE POLICY "avatars_profile_public_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'churches'
  );

DROP POLICY IF EXISTS "avatars_profile_insert_own" ON storage.objects;
CREATE POLICY "avatars_profile_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'churches'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_profile_update_own" ON storage.objects;
CREATE POLICY "avatars_profile_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'churches'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_profile_delete_own" ON storage.objects;
CREATE POLICY "avatars_profile_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'churches'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) Ensure owners/leaders can still update churches.logo_url
DROP POLICY IF EXISTS "Owners can update their church" ON public.churches;
DROP POLICY IF EXISTS "Owners and leaders can update their church" ON public.churches;
CREATE POLICY "Owners and leaders can update their church"
  ON public.churches FOR UPDATE
  USING (public.has_church_role(id, ARRAY['owner', 'leader']));

NOTIFY pgrst, 'reload schema';
