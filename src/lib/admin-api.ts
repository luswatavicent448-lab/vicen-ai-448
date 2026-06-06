const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vicen-admin`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const ADMIN_TOKEN_KEY = "vicen-admin-token";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminCall<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = getAdminToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let resp: Response;
  try {
    resp = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        ...(token ? { "x-admin-token": token } : {}),
      },
      body: JSON.stringify({ action, ...body }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if ((e as Error).name === "AbortError") {
      throw new Error("Connection timed out. Please try again.");
    }
    throw new Error("Could not reach the admin service. Check your connection and try again.");
  }
  clearTimeout(timeoutId);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || `Request failed (${resp.status})`);
  return data as T;
}