-- Chat rooms
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'New Room',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rooms"
ON public.chat_rooms FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create rooms"
ON public.chat_rooms FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete their rooms"
ON public.chat_rooms FOR DELETE
TO authenticated USING (auth.uid() = created_by);

-- Room members (also used for typing/presence)
CREATE TABLE public.room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_room_members_room ON public.room_members(room_id);

CREATE POLICY "Authenticated users can view members"
ON public.room_members FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Users can join rooms"
ON public.room_members FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
ON public.room_members FOR UPDATE
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
ON public.room_members FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Security definer function for membership check (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id)
$$;

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id, created_at);

CREATE POLICY "Members can view messages"
ON public.chat_messages FOR SELECT
TO authenticated USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Members can send messages"
ON public.chat_messages FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_room_member(room_id, auth.uid())
);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;