-- Setlist status workflow + location
ALTER TABLE public.setlists
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';

-- Backfill safety
UPDATE public.setlists SET status = 'scheduled' WHERE status IS NULL OR status = '';

-- Constrain status values (drop old constraint if re-run)
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

-- Optional active flag on membership
ALTER TABLE public.church_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_setlists_status ON public.setlists(status);
CREATE INDEX IF NOT EXISTS idx_setlists_church_date ON public.setlists(church_id, date);
