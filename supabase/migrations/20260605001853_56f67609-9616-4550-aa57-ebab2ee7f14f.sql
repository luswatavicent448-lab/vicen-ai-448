-- Prevent authenticated users from modifying muted_until on their own room_members row
CREATE OR REPLACE FUNCTION public.prevent_self_mute_bypass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NEW.muted_until IS DISTINCT FROM OLD.muted_until THEN
    RAISE EXCEPTION 'Cannot modify muted_until on your own membership';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_mute_bypass_trg ON public.room_members;
CREATE TRIGGER prevent_self_mute_bypass_trg
BEFORE UPDATE ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_mute_bypass();

-- Explicit deny on UPDATE for the 'papers' storage bucket
DROP POLICY IF EXISTS "Deny updates on papers bucket" ON storage.objects;
CREATE POLICY "Deny updates on papers bucket"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (bucket_id <> 'papers')
WITH CHECK (bucket_id <> 'papers');