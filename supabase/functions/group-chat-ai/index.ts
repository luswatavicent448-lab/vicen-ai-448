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
    const { roomId, userMessage, senderName, history } = await req.json();
    if (!roomId || !userMessage) {
      return new Response(JSON.stringify({ error: "roomId and userMessage required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const recent = Array.isArray(history) ? history.slice(-8) : [];
    const contextMessages = recent.map((m: { sender_name: string; content: string }) => ({
      role: "user" as const,
      content: `${m.sender_name}: ${m.content}`,
    }));

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
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
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
