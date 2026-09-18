-- Fix: remove open self-insert as musician (security hole).
-- Joining a church must go through join_church_by_invite (SECURITY DEFINER).

DROP POLICY IF EXISTS "Owners and leaders can insert members" ON public.church_members;

CREATE POLICY "Owners and leaders can insert members"
  ON public.church_members FOR INSERT
  WITH CHECK (
    public.has_church_role(church_id, ARRAY['owner', 'leader'])
    OR (
      NOT EXISTS (SELECT 1 FROM public.church_members WHERE church_id = church_members.church_id)
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );
