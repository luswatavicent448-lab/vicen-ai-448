import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SECRET) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — admin token signing key missing");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ---------- HMAC-signed token ----------
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacKey() {
  return await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signToken(payload: Record<string, unknown>, ttlSec: number): Promise<string> {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec, iat: Math.floor(Date.now() / 1000) };
  const head = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const pl = b64url(enc.encode(JSON.stringify(body)));
  const data = `${head}.${pl}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(data));
  return `${data}.${b64url(sig)}`;
}
async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), b64urlDecode(s), enc.encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDecode(p)));
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// ---------- failed-attempt tracker ----------
const attempts = new Map<string, { count: number; lockUntil: number }>();
function getClientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
}

async function requireAdmin(req: Request): Promise<{ ok: true; username: string } | { ok: false; resp: Response }> {
  const token = req.headers.get("x-admin-token") || "";
  const payload = await verifyToken(token);
  if (!payload || typeof payload.sub !== "string") {
    return { ok: false, resp: json({ error: "Unauthorized" }, 401) };
  }
  return { ok: true, username: payload.sub as string };
}

async function logAction(adminName: string, action: string, target = "", topic = "") {
  try {
    await admin.from("vicen_logs").insert({ admin_name: adminName, action, target, topic });
  } catch (e) { console.error("log error", e); }
}

// ---------- AI knowledge processor ----------
async function processKnowledge(rawContent: string, topic: string): Promise<{
  extracted_facts: string[]; entities: string[]; relationships: string[];
  categories: string[]; useful_for: string[]; context_summary: string;
}> {
  const fallback = {
    extracted_facts: [rawContent.slice(0, 500)],
    entities: [], relationships: [], categories: [topic || "general"],
    useful_for: [], context_summary: rawContent.slice(0, 200),
  };
  if (!LOVABLE_API_KEY) return fallback;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a knowledge extractor. Read the input and return STRICT JSON with keys: extracted_facts (array of short factual statements), entities (array of names/places/products), relationships (array of 'A relates to B' strings), categories (array of category labels), useful_for (array of question-types this knowledge answers), context_summary (one-sentence summary). Return ONLY the JSON object, no markdown." },
          { role: "user", content: `Topic: ${topic || "(none)"}\n\nContent:\n${rawContent}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!resp.ok) return fallback;
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    return {
      extracted_facts: Array.isArray(parsed.extracted_facts) ? parsed.extracted_facts.slice(0, 50).map(String) : fallback.extracted_facts,
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 50).map(String) : [],
      relationships: Array.isArray(parsed.relationships) ? parsed.relationships.slice(0, 50).map(String) : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 20).map(String) : [topic || "general"],
      useful_for: Array.isArray(parsed.useful_for) ? parsed.useful_for.slice(0, 20).map(String) : [],
      context_summary: typeof parsed.context_summary === "string" ? parsed.context_summary.slice(0, 500) : fallback.context_summary,
    };
  } catch (e) { console.error("processKnowledge error", e); return fallback; }
}

// ---------- request handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body.action || "");

  // ---- public: login ----
  if (action === "login") {
    const key = getClientKey(req);
    const a = attempts.get(key);
    if (a && a.lockUntil > Date.now()) {
      return json({ error: "Too many failed attempts. Please wait 30 seconds before trying again." }, 429);
    }
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const keepSignedIn = !!body.keepSignedIn;
    if (!username || !password) return json({ error: "Missing credentials" }, 400);

    const { data: rec } = await admin.from("admin_credentials").select("username, password_hash").eq("username", username).maybeSingle();
    let ok = false;
    if (rec?.password_hash) {
      try { ok = await bcrypt.compare(password, rec.password_hash); } catch { ok = false; }
    }
    if (!ok) {
      const cur = attempts.get(key) || { count: 0, lockUntil: 0 };
      cur.count += 1;
      if (cur.count >= 5) { cur.lockUntil = Date.now() + 30_000; cur.count = 0; }
      attempts.set(key, cur);
      return json({ error: "Invalid credentials" }, 401);
    }
    attempts.delete(key);
    const ttl = keepSignedIn ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
    const token = await signToken({ sub: username }, ttl);
    await logAction(username, "Admin logged in");
    return json({ token, expiresIn: ttl });
  }

  // ---- everything below requires admin ----
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.resp;
  const username = auth.username;

  switch (action) {
    case "verify":
      return json({ ok: true, username });

    case "logout":
      await logAction(username, "Admin logged out");
      return json({ ok: true });

    // ---------- IMAGES ----------
    case "image_upload": {
      const { dataUrl, url: srcUrl, title, description, tags, category, sub_category, country, is_active } = body as Record<string, unknown>;
      if (!title || typeof title !== "string") return json({ error: "Title required" }, 400);

      let finalUrl = "";
      let mime = "image/jpeg";
      let size = 0;
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return json({ error: "Invalid data URL" }, 400);
        mime = m[1];
        const bin = atob(m[2]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        size = bytes.length;
        if (size > 10 * 1024 * 1024) return json({ error: "File too large (max 10MB)" }, 413);
        const ext = mime.split("/")[1] || "jpg";
        const path = `images/${crypto.randomUUID()}.${ext}`;
        const up = await admin.storage.from("vicen-images").upload(path, bytes, { contentType: mime, upsert: false });
        if (up.error) return json({ error: `Upload failed: ${up.error.message}` }, 500);
        const signed = await admin.storage.from("vicen-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (signed.error || !signed.data?.signedUrl) return json({ error: "Failed to sign URL" }, 500);
        finalUrl = signed.data.signedUrl;
      } else if (typeof srcUrl === "string" && /^https?:\/\//.test(srcUrl)) {
        finalUrl = srcUrl;
      } else {
        return json({ error: "Provide either file or URL" }, 400);
      }

      const tagsArr = Array.isArray(tags)
        ? tags.map(String).map((t) => t.trim()).filter(Boolean)
        : typeof tags === "string"
          ? (tags as string).split(",").map((t) => t.trim()).filter(Boolean)
          : [];

      const { data: inserted, error } = await admin.from("vicen_images").insert({
        title: String(title),
        description: String(description || ""),
        tags: tagsArr,
        category: String(category || "general"),
        sub_category: String(sub_category || ""),
        url: finalUrl,
        thumbnail_url: finalUrl,
        country: String(country || ""),
        is_active: is_active === false ? false : true,
        uploaded_by: username,
        mime_type: mime,
        file_size: size,
      }).select("id, title").single();
      if (error) return json({ error: error.message }, 500);
      await logAction(username, "Admin uploaded", String(title));
      return json({ ok: true, image: inserted });
    }

    case "image_list": {
      const search = String(body.search || "").trim().toLowerCase();
      const category = String(body.category || "");
      let q = admin.from("vicen_images").select("*").order("created_at", { ascending: false }).limit(500);
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      let rows = data || [];
      if (search) rows = rows.filter((r) =>
        r.title.toLowerCase().includes(search) ||
        (r.description || "").toLowerCase().includes(search) ||
        (r.tags || []).join(" ").toLowerCase().includes(search));
      return json({ images: rows });
    }

    case "image_update": {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const patch: Record<string, unknown> = {};
      for (const k of ["title", "description", "category", "sub_category", "is_active", "country"]) {
        if (k in body) patch[k] = (body as Record<string, unknown>)[k];
      }
      if ("tags" in body) {
        const t = (body as Record<string, unknown>).tags;
        patch.tags = Array.isArray(t) ? t.map(String) : typeof t === "string" ? t.split(",").map((s) => s.trim()).filter(Boolean) : [];
      }
      const { data: pre } = await admin.from("vicen_images").select("title").eq("id", id).maybeSingle();
      const { error } = await admin.from("vicen_images").update(patch).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await logAction(username, "Admin edited", pre?.title || id);
      return json({ ok: true });
    }

    case "image_delete": {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: pre } = await admin.from("vicen_images").select("title, url").eq("id", id).maybeSingle();
      // Try removing from storage if it's a signed URL we own
      try {
        const u = pre?.url || "";
        const m = u.match(/\/storage\/v1\/object\/sign\/vicen-images\/([^?]+)/);
        if (m) await admin.storage.from("vicen-images").remove([m[1]]);
      } catch (e) { console.error("storage remove", e); }
      const { error } = await admin.from("vicen_images").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await logAction(username, "Admin deleted", pre?.title || id);
      return json({ ok: true });
    }

    // ---------- KNOWLEDGE ----------
    case "knowledge_add": {
      const raw = String(body.content || "").trim();
      const topic = String(body.topic || "").trim();
      if (!raw) return json({ error: "Content required" }, 400);
      const processed = await processKnowledge(raw, topic);
      const { error } = await admin.from("vicen_knowledge").insert({
        topic: topic || processed.context_summary.slice(0, 80),
        raw_content: raw,
        added_by: username,
        is_locked: false,
        is_visible: true,
        is_active: true,
        ...processed,
      });
      if (error) return json({ error: error.message }, 500);
      await logAction(username, "Admin added knowledge", "", topic);
      return json({ ok: true });
    }

    case "knowledge_list": {
      const search = String(body.search || "").trim().toLowerCase();
      const { data, error } = await admin.from("vicen_knowledge").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) return json({ error: error.message }, 500);
      let rows = data || [];
      if (search) rows = rows.filter((r) =>
        (r.topic || "").toLowerCase().includes(search) ||
        (r.raw_content || "").toLowerCase().includes(search));
      return json({ knowledge: rows });
    }

    case "knowledge_update": {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const patch: Record<string, unknown> = {};
      if ("topic" in body) patch.topic = String((body as Record<string, unknown>).topic || "");
      if ("is_active" in body) patch.is_active = !!(body as Record<string, unknown>).is_active;
      if ("content" in body) {
        const raw = String((body as Record<string, unknown>).content || "");
        patch.raw_content = raw;
        const proc = await processKnowledge(raw, String(patch.topic || ""));
        Object.assign(patch, proc);
      }
      const { data: pre } = await admin.from("vicen_knowledge").select("topic").eq("id", id).maybeSingle();
      const { error } = await admin.from("vicen_knowledge").update(patch).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      if ("is_active" in body) {
        await logAction(username, (body as Record<string, unknown>).is_active ? "Admin enabled knowledge" : "Admin disabled knowledge", "", pre?.topic || id);
      } else {
        await logAction(username, "Admin edited knowledge", "", pre?.topic || id);
      }
      return json({ ok: true });
    }

    case "knowledge_delete": {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: pre } = await admin.from("vicen_knowledge").select("topic").eq("id", id).maybeSingle();
      const { error } = await admin.from("vicen_knowledge").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await logAction(username, "Admin deleted knowledge", "", pre?.topic || id);
      return json({ ok: true });
    }

    // ---------- STATS / LOGS ----------
    case "stats": {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const [tot, act, dis, upT, edT] = await Promise.all([
        admin.from("vicen_images").select("id", { count: "exact", head: true }),
        admin.from("vicen_images").select("id", { count: "exact", head: true }).eq("is_active", true),
        admin.from("vicen_images").select("id", { count: "exact", head: true }).eq("is_active", false),
        admin.from("vicen_logs").select("id", { count: "exact", head: true }).gte("timestamp", todayIso).eq("action", "Admin uploaded"),
        admin.from("vicen_logs").select("id", { count: "exact", head: true }).gte("timestamp", todayIso).eq("action", "Admin edited"),
      ]);
      return json({
        total_images: tot.count || 0,
        active_images: act.count || 0,
        disabled_images: dis.count || 0,
        uploads_today: upT.count || 0,
        edits_today: edT.count || 0,
      });
    }

    case "logs": {
      const { data, error } = await admin.from("vicen_logs").select("*").order("timestamp", { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ logs: data || [] });
    }

    // ---------- CREDENTIALS ----------
    case "update_credentials": {
      const currentPassword = String(body.currentPassword || "");
      const newUsername = body.newUsername ? String(body.newUsername).trim() : null;
      const newPassword = body.newPassword ? String(body.newPassword) : null;
      if (!currentPassword) return json({ error: "Current password required" }, 400);
      const { data: rec } = await admin.from("admin_credentials").select("id, username, password_hash").eq("username", username).maybeSingle();
      if (!rec) return json({ error: "Account not found" }, 404);
      const ok = await bcrypt.compare(currentPassword, rec.password_hash);
      if (!ok) return json({ error: "Current password is incorrect" }, 401);
      const patch: Record<string, unknown> = {};
      if (newUsername && newUsername !== username) patch.username = newUsername;
      if (newPassword) {
        if (newPassword.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
        patch.password_hash = await bcrypt.hash(newPassword);
      }
      if (Object.keys(patch).length === 0) return json({ error: "No changes" }, 400);
      const { error } = await admin.from("admin_credentials").update(patch).eq("id", rec.id);
      if (error) return json({ error: error.message }, 500);
      await logAction(username, "Admin updated credentials successfully");
      return json({ ok: true });
    }

    default:
      return json({ error: "Unknown action" }, 400);
  }
});