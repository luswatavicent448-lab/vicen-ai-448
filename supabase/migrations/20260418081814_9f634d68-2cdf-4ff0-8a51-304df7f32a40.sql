-- Fix ambiguous "code" column reference in create_room_with_code
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
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _is_private THEN
    IF _password IS NULL OR length(_password) = 0 THEN
      RAISE EXCEPTION 'Password required for private room';
    END IF;
    _hash := extensions.crypt(_password, extensions.gen_salt('bf'));
  END IF;

  -- Generate a unique 6-char code (qualify chat_rooms.code to avoid ambiguity with OUT param)
  LOOP
    _new_code := UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chat_rooms cr WHERE cr.code = _new_code);
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

  RETURN QUERY SELECT _new_id AS id, _new_code AS code;
END;
$function$;