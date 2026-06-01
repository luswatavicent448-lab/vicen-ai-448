
-- 1) chat_rooms: hide password_hash column from clients (column-level)
REVOKE SELECT (password_hash) ON public.chat_rooms FROM anon, authenticated;

-- 2) room_members: restrict SELECT to self or fellow members of same room
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.room_members;
CREATE POLICY "Members can view fellow room members"
ON public.room_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_room_member(room_id, auth.uid())
);

-- 3) Realtime: restrict topic subscriptions by room membership
-- Topic pattern used by client: 'room:<uuid>'
DROP POLICY IF EXISTS "Room members can subscribe to room topics" ON realtime.messages;
CREATE POLICY "Room members can subscribe to room topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'room:%' THEN
      public.is_room_member(
        substring(realtime.topic() FROM 6)::uuid,
        auth.uid()
      )
    ELSE true
  END
);

-- 4) voice-messages bucket: make private and require room membership to read
UPDATE storage.buckets SET public = false WHERE id = 'voice-messages';

DROP POLICY IF EXISTS "Voice messages are publicly readable" ON storage.objects;
CREATE POLICY "Room members can read voice messages"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.is_room_member(((storage.foldername(name))[2])::uuid, auth.uid())
);

-- 5) SECURITY DEFINER functions: limit who can EXECUTE
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_room_with_code(text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_room_with_code(text, boolean, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.join_room_with_code(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_room_with_code(text, text, text) TO authenticated, service_role;
