// Vicen AI moderation: runs server-side with service role.
// - Detects abusive language (seed list + learned words)
// - Tracks per-user offense score in-memory per room
// - Issues warning -> final warning -> mute system messages
// - Learns new abusive-looking words (>= LEARN_THRESHOLD repeats) into the
//   private learned_words table. Clients NEVER see this table.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_USER_ID = "00000000-0000-0000-0000-000000000bot";
const BOT_NAME = "VICEN AI 🤖";

// Seed abusive list (English + Swahili examples). Extend as needed.
const SEED_BAD_WORDS = [
  "idiot", "stupid", "fool", "dumb", "moron", "loser",
  "nyoko", "pumbavu", "mjinga", "mavi",
];

// Learning threshold: how many times a candidate word must appear in
// proximity to abusive context before being learned.
const LEARN_THRESHOLD = 3;

// In-memory state (per warm instance). Acceptable for moderation: worst case
// a warning resets when the function cold-starts.
const userScores = new Map<string, { score: number; muted: boolean }>(); // key: roomId:userId
const candidateCounts = new Map<string, number>(); // key: word

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

function detectAbuse(text: string, learned: Set<string>): {
  score: number;
  hits: string[];
} {
  const tokens = tokenize(text);
  const hits: string[] = [];
  let score = 0;
  for (const t of tokens) {
    if (SEED_BAD_WORDS.includes(t) || learned.has(t)) {
      score += 3;
      hits.push(t);
    }
  }
  // Shouting heuristic
  if (text.length > 5 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    score += 1;
  }
  return { score, hits };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { roomId, userId, senderName, content } = await req.json();
    if (!roomId || !userId || !content) {
      return new Response(JSON.stringify({ error: "roomId, userId, content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load learned words (system-only access via service role)
    const { data: learnedRows } = await admin
      .from("learned_words")
      .select("word");
    const learned = new Set<string>((learnedRows ?? []).map((r: { word: string }) => r.word));

    const { score: msgScore, hits } = detectAbuse(content, learned);

    // Bump per-user score in this room
    const key = `${roomId}:${userId}`;
    const state = userScores.get(key) ?? { score: 0, muted: false };

    if (state.muted) {
      return new Response(
        JSON.stringify({ allowed: false, muted: true, reason: "muted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let action: "allow" | "warn" | "final" | "mute" = "allow";
    if (msgScore > 0) {
      state.score += msgScore;
      if (state.score >= 9) {
        state.muted = true;
        action = "mute";
      } else if (state.score >= 6) {
        action = "final";
      } else if (state.score >= 3) {
        action = "warn";
      }
    }
    userScores.set(key, state);

    // Update counts for hit words (already-known abusive terms)
    for (const w of hits) {
      if (learned.has(w)) {
        await admin.rpc("increment_learned_word", { _word: w }).catch(() => {
          // Fallback: best-effort upsert if RPC doesn't exist
          admin.from("learned_words").upsert(
            { word: w, count: 1 },
            { onConflict: "word", ignoreDuplicates: false }
          );
        });
      }
    }

    // Learn new candidate words: only when message already had abusive context
    // (msgScore > 0 from seed/learned hits) — prevents learning innocent words.
    if (msgScore >= 3) {
      const tokens = tokenize(content);
      for (const t of tokens) {
        if (SEED_BAD_WORDS.includes(t) || learned.has(t)) continue;
        const c = (candidateCounts.get(t) ?? 0) + 1;
        candidateCounts.set(t, c);
        if (c >= LEARN_THRESHOLD) {
          candidateCounts.delete(t);
          await admin
            .from("learned_words")
            .upsert({ word: t, count: 1 }, { onConflict: "word" });
        }
      }
    }

    // Post system message from bot when action != allow
    if (action !== "allow") {
      const messages: Record<string, string> = {
        warn: `⚠️ @${senderName || "User"} — please avoid abusive language. This is a warning.`,
        final: `⚠️ @${senderName || "User"} — final warning. Continued abuse will result in a mute.`,
        mute: `🚫 @${senderName || "User"} has been muted for repeated abusive language.`,
      };
      await admin.from("chat_messages").insert({
        room_id: roomId,
        user_id: BOT_USER_ID,
        sender_name: BOT_NAME,
        content: messages[action],
      });
    }

    return new Response(
      JSON.stringify({
        allowed: action === "allow",
        action,
        muted: state.muted,
        score: state.score,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("moderate-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
