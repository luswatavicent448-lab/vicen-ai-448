import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  initial: string;
  createdAt: string | null;
};

const empty: UserProfile = {
  email: null,
  displayName: null,
  avatarUrl: null,
  initial: "G",
  createdAt: null,
};

function fromUser(user: { email?: string | null; created_at?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): UserProfile {
  if (!user) return empty;
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const displayName = meta.display_name || meta.full_name || meta.name || null;
  const email = user.email ?? null;
  const initial = (displayName?.[0] ?? email?.[0] ?? "G").toUpperCase();
  return {
    email,
    displayName,
    avatarUrl: meta.avatar_url ?? null,
    initial,
    createdAt: user.created_at ?? null,
  };
}

/**
 * Single source of truth for the signed-in user's identity.
 * Used by every settings screen so the avatar/name stay consistent.
 */
export function useUserProfile(): UserProfile {
  const [profile, setProfile] = useState<UserProfile>(empty);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setProfile(fromUser(data.user));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setProfile(fromUser(s?.user ?? null));
    });
    // Listen for in-app metadata updates (e.g. after avatar upload)
    const onUpdate = () => {
      supabase.auth.getUser().then(({ data }) => setProfile(fromUser(data.user)));
    };
    window.addEventListener("vicen-profile-updated", onUpdate);
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("vicen-profile-updated", onUpdate);
    };
  }, []);

  return profile;
}

/** Call after updating avatar/display name so all consumers refresh instantly. */
export function notifyProfileUpdated() {
  window.dispatchEvent(new Event("vicen-profile-updated"));
}
