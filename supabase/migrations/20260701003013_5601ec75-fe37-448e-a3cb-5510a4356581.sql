
-- 1) Enforce sender_name from room_members (block impersonation)
CREATE OR REPLACE FUNCTION public.enforce_chat_sender_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display TEXT;
BEGIN
  -- Service role / bot inserts (no auth context) are trusted
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;

  SELECT display_name INTO _display
  FROM public.room_members
  WHERE room_id = NEW.room_id AND user_id = NEW.user_id;

  IF _display IS NULL THEN
    RAISE EXCEPTION 'Not a member of this room';
  END IF;

  NEW.sender_name := _display;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_chat_sender_name_trg ON public.chat_messages;
CREATE TRIGGER enforce_chat_sender_name_trg
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_sender_name();

-- 2) Server-side moderation block for direct client inserts that skip the edge function
CREATE OR REPLACE FUNCTION public.moderate_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized TEXT;
  _bad TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.message_type = 'voice' THEN RETURN NEW; END IF;
  IF NEW.content IS NULL OR length(NEW.content) = 0 THEN RETURN NEW; END IF;

  _normalized := lower(regexp_replace(NEW.content, '[^a-zA-Z]', '', 'g'));

  FOREACH _bad IN ARRAY ARRAY[
    'fuck','shit','bitch','asshole','dick','pussy','cunt','bastard',
    'nigger','nigga','faggot','retard','slut','whore','motherfucker'
  ] LOOP
    IF position(_bad IN _normalized) > 0 THEN
      RAISE EXCEPTION 'Message blocked by moderation';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.learned_words lw
    WHERE length(lw.word) >= 3
      AND position(lw.word IN _normalized) > 0
  ) THEN
    RAISE EXCEPTION 'Message blocked by moderation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS moderate_chat_message_trg ON public.chat_messages;
CREATE TRIGGER moderate_chat_message_trg
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.moderate_chat_message();

-- 3) Move password_hash off chat_rooms into a fully-locked secrets table
CREATE TABLE IF NOT EXISTS public.chat_room_secrets (
  room_id UUID PRIMARY KEY REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_room_secrets TO service_role;
ALTER TABLE public.chat_room_secrets ENABLE ROW LEVEL SECURITY;
-- No policies: only accessible via service_role and SECURITY DEFINER functions

INSERT INTO public.chat_room_secrets (room_id, password_hash)
SELECT id, password_hash FROM public.chat_rooms
WHERE password_hash IS NOT NULL
ON CONFLICT (room_id) DO NOTHING;

ALTER TABLE public.chat_rooms DROP COLUMN IF EXISTS password_hash;

CREATE OR REPLACE FUNCTION public.create_room_with_code(_name text, _is_private boolean, _password text, _display_name text)
 RETURNS TABLE(id uuid, code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _new_code TEXT;
  _hash TEXT;
  _new_id uuid;
  _attempts int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _is_private THEN
    IF _password IS NULL OR length(_password) = 0 THEN
      RAISE EXCEPTION 'Password required for private room';
    END IF;
    _hash := extensions.crypt(_password, extensions.gen_salt('bf'));
  END IF;

  LOOP
    _new_code := UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chat_rooms cr WHERE cr.code = _new_code);
    _attempts := _attempts + 1;
    IF _attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
  END LOOP;

  INSERT INTO public.chat_rooms (name, created_by, code, is_private)
  VALUES (COALESCE(NULLIF(_name, ''), 'New Room'), _uid, _new_code, _is_private)
  RETURNING chat_rooms.id INTO _new_id;

  IF _hash IS NOT NULL THEN
    INSERT INTO public.chat_room_secrets (room_id, password_hash) VALUES (_new_id, _hash);
  END IF;

  INSERT INTO public.room_members (room_id, user_id, display_name, is_typing, last_seen)
  VALUES (_new_id, _uid, COALESCE(NULLIF(_display_name, ''), 'User'), false, now());

  RETURN QUERY SELECT _new_id AS id, _new_code AS code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_room_with_code(_code text, _password text, _display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _room public.chat_rooms;
  _hash TEXT;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _room FROM public.chat_rooms WHERE code = UPPER(_code) LIMIT 1;
  IF _room.id IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;

  IF _room.is_private THEN
    SELECT password_hash INTO _hash FROM public.chat_room_secrets WHERE room_id = _room.id;
    IF _password IS NULL OR _hash IS NULL
       OR extensions.crypt(_password, _hash) <> _hash THEN
      RAISE EXCEPTION 'Wrong password';
    END IF;
  END IF;

  INSERT INTO public.room_members (room_id, user_id, display_name, is_typing, last_seen)
  VALUES (_room.id, _uid, COALESCE(NULLIF(_display_name, ''), 'User'), false, now())
  ON CONFLICT (room_id, user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name, last_seen = now();

  RETURN _room.id;
END;
$function$;
