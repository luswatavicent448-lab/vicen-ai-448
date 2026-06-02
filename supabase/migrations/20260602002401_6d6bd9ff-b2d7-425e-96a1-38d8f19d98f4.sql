-- 1) Restrict chat_rooms SELECT to members only
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON public.chat_rooms;
CREATE POLICY "Members can view their rooms"
ON public.chat_rooms
FOR SELECT
TO authenticated
USING (public.is_room_member(id, auth.uid()));

-- 2) Make papers bucket private
UPDATE storage.buckets SET public = false WHERE id = 'papers';

-- Owner-only storage policies for papers
DROP POLICY IF EXISTS "Users can read their own papers" ON storage.objects;
CREATE POLICY "Users can read their own papers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own papers (storage)" ON storage.objects;
CREATE POLICY "Users can upload their own papers (storage)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own papers (storage)" ON storage.objects;
CREATE POLICY "Users can delete their own papers (storage)"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3) Add explicit UPDATE policy on voice-messages bucket (owner only)
DROP POLICY IF EXISTS "Users can update their own voice messages" ON storage.objects;
CREATE POLICY "Users can update their own voice messages"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4) Tighten realtime.messages SELECT policy: default-deny non-room topics
DROP POLICY IF EXISTS "Room members can subscribe to room topics" ON realtime.messages;
CREATE POLICY "Room members can subscribe to room topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'room:%'
      THEN public.is_room_member((substring(realtime.topic() FROM 6))::uuid, auth.uid())
    ELSE false
  END
);