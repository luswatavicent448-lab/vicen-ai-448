
REVOKE SELECT (password_hash) ON public.chat_rooms FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own paper files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own paper files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own paper files" ON storage.objects;
