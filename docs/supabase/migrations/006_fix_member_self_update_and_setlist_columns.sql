-- 006: Ensure setlist location/status exist + allow members to update own instrument
-- Run this in Supabase SQL Editor if escalas fail with "location" or profile instrument fails for musicians.

-- 1) Setlist columns (safe if already present)
ALTER TABLE public.setlists
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.setlists
SET status = 'scheduled'
WHERE status IS NULL OR status = '';

ALTER TABLE public.setlists
  ALTER COLUMN status SET DEFAULT 'scheduled',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'setlists_status_check'
  ) THEN
    ALTER TABLE public.setlists
      ADD CONSTRAINT setlists_status_check
      CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_setlists_status ON public.setlists(status);
CREATE INDEX IF NOT EXISTS idx_setlists_church_date ON public.setlists(church_id, date);

-- 2) Membership: musicians can update their own row (instrument), but cannot escalate role
DROP POLICY IF EXISTS "Members can update own membership" ON public.church_members;
CREATE POLICY "Members can update own membership"
  ON public.church_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent non-owners from changing role via self-update
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.has_church_role(OLD.church_id, ARRAY['owner', 'leader']) THEN
      RAISE EXCEPTION 'Sem permissão para alterar a função do membro';
    END IF;
    -- Leaders cannot promote to owner
    IF NEW.role = 'owner' AND NOT public.has_church_role(OLD.church_id, ARRAY['owner']) THEN
      RAISE EXCEPTION 'Apenas o administrador pode definir outro administrador';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS church_members_prevent_role_escalation ON public.church_members;
CREATE TRIGGER church_members_prevent_role_escalation
  BEFORE UPDATE ON public.church_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 3) Profile birth_date (safe)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 4) Notify PostgREST to reload schema cache after column adds
NOTIFY pgrst, 'reload schema';
