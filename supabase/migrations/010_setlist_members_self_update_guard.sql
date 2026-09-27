-- 010: Restringe o self-update em setlist_members à coluna status.
-- A política "Users can update own status" permitia ao próprio membro alterar
-- qualquer coluna da sua linha (instrument, setlist_id, etc.). O trigger abaixo
-- bloqueia alterações além de status, exceto para owner/leader da igreja.

CREATE OR REPLACE FUNCTION public.setlist_members_self_update_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id = auth.uid()
     AND NOT public.has_church_role(
           public.get_setlist_church_id(OLD.setlist_id),
           ARRAY['owner', 'leader']
         ) THEN
    IF NEW.id <> OLD.id
       OR NEW.setlist_id <> OLD.setlist_id
       OR NEW.user_id <> OLD.user_id
       OR NEW.instrument IS DISTINCT FROM OLD.instrument
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Membros só podem alterar o próprio status na escala';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS setlist_members_self_update_guard ON public.setlist_members;
CREATE TRIGGER setlist_members_self_update_guard
  BEFORE UPDATE ON public.setlist_members
  FOR EACH ROW
  EXECUTE FUNCTION public.setlist_members_self_update_guard();
