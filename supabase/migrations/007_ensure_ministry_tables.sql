-- Ensure ministry structure exists (idempotent). Fixes PostgREST "table not in schema cache".
-- Run in Supabase SQL Editor, then: NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.ministry_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ministry_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.member_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.member_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ministry_teams_church ON public.ministry_teams(church_id);
CREATE INDEX IF NOT EXISTS idx_ministry_roles_church ON public.ministry_roles(church_id);
CREATE INDEX IF NOT EXISTS idx_member_classifications_church ON public.member_classifications(church_id);
CREATE INDEX IF NOT EXISTS idx_member_unavailability_church ON public.member_unavailability(church_id);
CREATE INDEX IF NOT EXISTS idx_announcements_church ON public.announcements(church_id);

ALTER TABLE public.ministry_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop/recreate policies safely
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'ministry_teams','ministry_roles','member_classifications',
        'member_unavailability','announcements'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ministry_teams
CREATE POLICY ministry_teams_select ON public.ministry_teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_teams.church_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY ministry_teams_insert ON public.ministry_teams FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_teams.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY ministry_teams_update ON public.ministry_teams FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_teams.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY ministry_teams_delete ON public.ministry_teams FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_teams.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));

-- ministry_roles
CREATE POLICY ministry_roles_select ON public.ministry_roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_roles.church_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY ministry_roles_insert ON public.ministry_roles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_roles.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY ministry_roles_update ON public.ministry_roles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_roles.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY ministry_roles_delete ON public.ministry_roles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = ministry_roles.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));

-- member_classifications
CREATE POLICY member_classifications_select ON public.member_classifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = member_classifications.church_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY member_classifications_insert ON public.member_classifications FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = member_classifications.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY member_classifications_update ON public.member_classifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = member_classifications.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY member_classifications_delete ON public.member_classifications FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = member_classifications.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));

-- member_unavailability
CREATE POLICY member_unavailability_select ON public.member_unavailability FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = member_unavailability.church_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY member_unavailability_insert ON public.member_unavailability FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.church_members cm
      WHERE cm.church_id = member_unavailability.church_id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY member_unavailability_update ON public.member_unavailability FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.church_members cm
      WHERE cm.church_id = member_unavailability.church_id AND cm.user_id = auth.uid()
        AND cm.role IN ('owner','leader')
    )
  );
CREATE POLICY member_unavailability_delete ON public.member_unavailability FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.church_members cm
      WHERE cm.church_id = member_unavailability.church_id AND cm.user_id = auth.uid()
        AND cm.role IN ('owner','leader')
    )
  );

-- announcements
CREATE POLICY announcements_select ON public.announcements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = announcements.church_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY announcements_insert ON public.announcements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = announcements.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY announcements_update ON public.announcements FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = announcements.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));
CREATE POLICY announcements_delete ON public.announcements FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.church_members cm
    WHERE cm.church_id = announcements.church_id AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','leader')
  ));

NOTIFY pgrst, 'reload schema';
