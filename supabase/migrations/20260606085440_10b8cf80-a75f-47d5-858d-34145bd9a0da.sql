
-- 1) Prevent password_hash leakage to room members
REVOKE SELECT (password_hash) ON public.chat_rooms FROM anon, authenticated;

-- 2) Prevent users from clearing/altering their own mute via column privileges
--    (defense-in-depth alongside the prevent_self_mute_bypass trigger)
REVOKE UPDATE (muted_until) ON public.room_members FROM anon, authenticated;
