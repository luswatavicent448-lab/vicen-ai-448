-- Add code, privacy, and password fields to chat_rooms
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Backfill codes for any existing rooms
UPDATE public.chat_rooms
SET code = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE code IS NULL;

-- Make code unique and required
ALTER TABLE public.chat_rooms
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_code_key ON public.chat_rooms (code);

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- RPC: join a room by code (and optional password). Returns the room id on success.
CREATE OR REPLACE FUNCTION public.join_room_with_code(
  _code TEXT,
  _password TEXT,
  _display_name TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _room public.chat_rooms;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _room FROM public.chat_rooms WHERE code = UPPER(_code) LIMIT 1;
  IF _room.id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF _room.is_private THEN
    IF _password IS NULL OR _room.password_hash IS NULL
       OR extensions.crypt(_password, _room.password_hash) <> _room.password_hash THEN
      RAISE EXCEPTION 'Wrong password';
    END IF;
  END IF;

  INSERT INTO public.room_members (room_id, user_id, display_name, is_typing, last_seen)
  VALUES (_room.id, _uid, COALESCE(NULLIF(_display_name, ''), 'User'), false, now())
  ON CONFLICT (room_id, user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        last_seen = now();

  RETURN _room.id;
END;
$$;

-- RPC: create a room with optional privacy + password. Auto-joins creator.
CREATE OR REPLACE FUNCTION public.create_room_with_code(
  _name TEXT,
  _is_private BOOLEAN,
  _password TEXT,
  _display_name TEXT
)
RETURNS TABLE(id uuid, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_code TEXT;
  _hash TEXT;
  _new_id uuid;
  _attempts int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _is_private THEN
    IF _password IS NULL OR length(_password) = 0 THEN
      RAISE EXCEPTION 'Password required for private room';
    END IF;
    _hash := extensions.crypt(_password, extensions.gen_salt('bf'));
  END IF;

  -- Generate a unique 6-char code
  LOOP
    _new_code := UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE code = _new_code);
    _attempts := _attempts + 1;
    IF _attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique code';
    END IF;
  END LOOP;

  INSERT INTO public.chat_rooms (name, created_by, code, is_private, password_hash)
  VALUES (COALESCE(NULLIF(_name, ''), 'New Room'), _uid, _new_code, _is_private, _hash)
  RETURNING chat_rooms.id INTO _new_id;

  INSERT INTO public.room_members (room_id, user_id, display_name, is_typing, last_seen)
  VALUES (_new_id, _uid, COALESCE(NULLIF(_display_name, ''), 'User'), false, now());

  RETURN QUERY SELECT _new_id, _new_code;
END;
$$;