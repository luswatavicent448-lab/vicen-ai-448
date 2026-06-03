
ALTER TABLE public.room_members
  ADD COLUMN IF NOT EXISTS muted_until timestamptz;

CREATE OR REPLACE FUNCTION public.is_user_muted(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND muted_until IS NOT NULL
      AND muted_until > now()
  )
$$;

DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
CREATE POLICY "Members can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_room_member(room_id, auth.uid())
  AND NOT public.is_user_muted(room_id, auth.uid())
);
