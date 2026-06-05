import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_USER_ID = "00000000-0000-0000-0000-0000000000b0";
const BOT_NAME = "VICEN AI 🤖";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AuthN: validate JWT from caller ---
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const { roomId, userMessage: rawUserMessage, senderName: rawSenderName, history: rawHistory } = await req.json();
    if (!roomId || typeof rawUserMessage !== "string" || !rawUserMessage.trim()) {
      return new Response(JSON.stringify({ error: "roomId and userMessage required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rawUserMessage.length > 2000) {
      return new Response(JSON.stringify({ error: "userMessage too long (max 2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userMessage = rawUserMessage.slice(0, 2000);
    const senderName = typeof rawSenderName === "string"
      ? rawSenderName.replace(/[\r\n]+/g, " ").slice(0, 64)
      : "";

    // --- AuthZ: caller must be a member of the room ---
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: membership } = await admin
      .from("room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("user_id", callerId)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const recent = Array.isArray(rawHistory) ? rawHistory.slice(-8) : [];
    const contextMessages = recent
      .filter((m: unknown): m is { sender_name?: unknown; content?: unknown } =>
        !!m && typeof m === "object")
      .map((m) => {
        const name = typeof m.sender_name === "string"
          ? m.sender_name.replace(/[\r\n]+/g, " ").slice(0, 64)
          : "User";
        const content = typeof m.content === "string" ? m.content.slice(0, 2000) : "";
        return { role: "user" as const, content: `${name}: ${content}` };
      });

    const systemPrompt = `You are VICEN AI, a friendly assistant participating in a group chat.
Keep replies SHORT (1-3 sentences max), warm, and conversational.
${senderName ? `The latest message is from ${senderName}.` : ""}
Reply in plain text only — no markdown, no headings, no bullet points.
You're one voice in a group — don't dominate; be helpful and natural.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...contextMessages,
          { role: "user", content: `${senderName || "User"}: ${userMessage}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      throw new Error("AI service error");
    }

    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "🤖 (no reply)";

    // Insert as bot using service role (bypasses RLS)
    const { error: insertErr } = await admin.from("chat_messages").insert({
      room_id: roomId,
      user_id: BOT_USER_ID,
      sender_name: BOT_NAME,
      content: reply,
    });
    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw insertErr;
    }

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("group-chat-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
