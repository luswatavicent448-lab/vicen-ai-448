// Vicen AI advanced moderation: server-side with service role.
// - Detects abusive language with bypass-resistant normalization
//   (leetspeak, spacing, repeated chars, symbols, misspellings)
// - Detects multi-word phrases (e.g. "fuck off", "shut up")
// - Multi-language: English + Luganda + Swahili
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

const BOT_USER_ID = "00000000-0000-0000-0000-0000000000b0";
const BOT_NAME = "VICEN AI 🤖";

// Seed abusive list — single tokens. Variations are handled by normalization.
const SEED_BAD_WORDS = [
  // --- English profanity ---
  "fuck", "fucker", "fucking", "fuk", "fck", "motherfucker", "mf",
  "shit", "shyt", "bullshit", "crap", "crappy",
  "bitch", "biatch", "btch", "bich",
  "asshole", "ashole", "arsehole", "arse",
  "dick", "dickhead", "prick", "cock", "cockhead",
  "pussy", "cunt", "twat",
  "bastard", "damn", "douche", "douchebag",
  "wanker", "tosser", "jerk",
  "slut", "whore", "hoe", "skank", "thot",
  "retard", "retarded", "spaz",
  "nigger", "nigga", "fag", "faggot", "tranny", "dyke",
  // English insults
  "idiot", "stupid", "fool", "dumb", "dumbass", "moron", "loser", "imbecile",
  "scum", "trash", "garbage", "freak",

  // --- Swahili / Sheng (Kenya, Tanzania, Uganda) ---
  "mavi",        // shit
  "mshenzi", "shenzi",   // savage / barbarian (insult)
  "pumbavu", "mpumbavu", // fool / idiot
  "mjinga", "wajinga",   // stupid
  "mjinga we", "punda",  // donkey (insult)
  "malaya", "kahaba",    // prostitute
  "nyoko", "nyokonyoko", // mother insult
  "mbwa",                // dog (insult)
  "kuma", "kumamako",    // strongest matusi (vulgar)
  "mboo", "mbolo",       // vulgar male anatomy
  "fala",                // fool
  "zezeta", "zuzu",      // dim-witted
  "tako", "matako",      // ass
  "kojoa",               // urinate (vulgar usage)
  "ushenzi",             // savagery
  "umbwa", "umama",      // your-mother / dog insult
  "buzi",                // sugar daddy / insult slang
  "ngombe",              // cow (insult)
  "kichaa",              // crazy person (insult)

  // --- Luganda (Uganda) ---
  "musiru", "kasiru", "basiru",       // fool / idiot
  "kifere", "kiferenge",              // stupid / clumsy
  "kikoligo",                         // crooked / insult
  "malaaya",                          // prostitute
  "kasilamu",                         // derogatory
  "embwa", "mbwa",                    // dog (insult)
  "kibwankulata",                     // worthless / insult
  "muyaga", "kinusi",                 // wind-bag / smelly
  "ekifere",                          // dimwit
  "omusilu", "omusiru",               // fool variants
  "kasajja", "kasiyira",              // derogatory persona terms
  "kawala", "kawalakata",             // derogatory
  "ssebo nange", "kifuba",            // insult expressions
  "kabwa",                            // little dog (insult)
  "nfuufu",                           // good-for-nothing
  "kikomando ggwe",                   // street-tough insult
  "lugezigezi",                       // arrogant fool
  "kasita", "katemba",                // mocking
];

// Multi-word phrases — checked against the spaced-normalized form
const SEED_BAD_PHRASES = [
  // English
  "fuck off", "fuck you", "fuck u", "f off", "f u",
  "shut up", "shut the fuck up", "stfu",
  "go to hell", "kiss my ass", "kiss my arse",
  "son of a bitch", "piece of shit",
  "eat shit", "screw you", "up yours",
  "your mom", "yo mama", "ur mom gay",

  // Swahili / Sheng phrases
  "mama yako", "shoga yako", "kuma mama",
  "nenda kuzimu", "wewe ni mjinga", "wewe ni mshenzi",
  "kichwa ngumu", "fala wewe",

  // Luganda phrases
  "genda eri", "ozze nyabo", "musiru gwe", "musilu gwe",
  "kibi nnyo", "ggwe musiru", "embwa ggwe",
  "wuliriza musiru", "vva wano",
];

// Regional language markers — non-abusive but signal Swahili/Luganda context.
// When detected, the abuse threshold lowers slightly to catch coded insults.
const REGIONAL_MARKERS = [
  // Swahili common particles/words
  "wewe", "mimi", "yako", "yangu", "nini", "kwa", "nilikuwa", "habari",
  "sasa", "leo", "kesho", "ndio", "hapana", "asante", "karibu",
  // Luganda common particles/words
  "ggwe", "nze", "lwaki", "nedda", "yee", "webale", "oli otya",
  "nnyabo", "ssebo", "nange", "naawe", "wano", "eri",
];

// Leetspeak / common substitution map
const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "|": "i",
  "3": "e", "4": "a", "@": "a",
  "5": "s", "$": "s", "7": "t",
  "8": "b", "9": "g",
};

// Learning threshold
const LEARN_THRESHOLD = 3;

// In-memory state (per warm instance)
const userScores = new Map<string, { score: number; muted: boolean }>();
const candidateCounts = new Map<string, number>();

// Room-level toxicity tracker: roomId -> [{ userId, ts }]
// Used to issue a general room warning when multiple users get flagged
// in a short window (smart intervention).
const roomToxicity = new Map<string, { userId: string; ts: number }[]>();
const roomLastGeneralWarn = new Map<string, number>();
const TOXICITY_WINDOW_MS = 60_000; // 1 minute
const TOXICITY_THRESHOLD = 3;       // 3 flagged messages in window
const GENERAL_WARN_COOLDOWN_MS = 120_000; // don't spam room warnings

// --- Normalization helpers ---

// Replace leetspeak chars with letters
function deLeet(text: string): string {
  let out = "";
  for (const ch of text) {
    out += LEET_MAP[ch] ?? ch;
  }
  return out;
}

// Collapse repeated letters: "fuuuuck" -> "fuck", "shiiit" -> "shit"
// Only collapse 3+ to 1 to keep things like "book" intact (2 reps).
function collapseRepeats(text: string): string {
  return text.replace(/([a-z])\1{2,}/g, "$1");
}

// Normalize for SINGLE-WORD detection: strip ALL non-letters (defeats spacing/symbol bypass)
// e.g. "f.u.c.k", "f u c k", "f*u*c*k" -> "fuck"
function normalizeTight(text: string): string {
  let t = text.toLowerCase();
  t = deLeet(t);
  t = t.replace(/[^a-z]/g, "");
  t = collapseRepeats(t);
  return t;
}

// Normalize for PHRASE detection: keep single spaces between words
function normalizeSpaced(text: string): string {
  let t = text.toLowerCase();
  t = deLeet(t);
  t = t.replace(/[^a-z\s]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  // collapse repeats per-word
  t = t.split(" ").map(collapseRepeats).join(" ");
  return t;
}

// Tokens for learning system (length > 2)
function tokenize(text: string): string[] {
  return normalizeSpaced(text)
    .split(" ")
    .filter((w) => w.length > 2);
}

// Levenshtein distance for fuzzy match (small, capped)
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

// Detect regional language context (Swahili / Luganda).
// Returns a multiplier so we can boost detection accuracy when users
// are clearly conversing in a regional language (coded insults are subtler).
function detectRegion(spaced: string): { region: "en" | "regional"; multiplier: number } {
  const tokens = spaced.split(" ").filter(Boolean);
  if (tokens.length === 0) return { region: "en", multiplier: 1 };
  let hits = 0;
  for (const t of tokens) {
    if (REGIONAL_MARKERS.includes(t)) hits++;
  }
  const ratio = hits / tokens.length;
  if (ratio >= 0.15) return { region: "regional", multiplier: 1.3 };
  return { region: "en", multiplier: 1 };
}

// Check if any bad word appears as substring of tight-normalized text,
// OR if a token is within edit-distance 1 of a bad word (catches "fucc", "shyt"-style).
function detectAbuse(
  text: string,
  learned: Set<string>,
): { score: number; hits: string[]; region: string } {
  const hits: string[] = [];
  let score = 0;

  const tight = normalizeTight(text);
  const spaced = normalizeSpaced(text);
  const { region, multiplier } = detectRegion(spaced);

  // 1. Substring match against tight form (defeats all spacing/symbol bypass)
  const allBadSingles = [...SEED_BAD_WORDS, ...learned];
  for (const w of allBadSingles) {
    if (w.length < 3) continue;
    if (tight.includes(w)) {
      score += 3;
      hits.push(w);
    }
  }

  // 2. Phrase match against spaced form
  for (const p of SEED_BAD_PHRASES) {
    if (spaced.includes(p)) {
      score += 4; // phrases are stronger signal
      hits.push(p);
    }
  }

  // 3. Fuzzy per-token match (catches misspellings not caught by substring)
  const tokens = tokenize(text);
  for (const t of tokens) {
    if (t.length < 4) continue;
    for (const w of allBadSingles) {
      if (w.length < 4) continue;
      if (hits.includes(w)) continue;
      if (lev(t, w) === 1) {
        score += 2;
        hits.push(w);
        break;
      }
    }
  }

  // 4. Shouting heuristic
  if (text.length > 5 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    score += 1;
  }

  // 5. Regional context multiplier — boosts confidence on Swahili/Luganda insults
  if (score > 0) score = Math.round(score * multiplier);

  return { score, hits: [...new Set(hits)], region };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AuthN: validate JWT and derive userId from claims (ignore client-supplied) ---
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
    const userId = claimsData.claims.sub as string;

    const { roomId, senderName, content } = await req.json();
    if (!roomId || !content) {
      return new Response(
        JSON.stringify({ error: "roomId and content required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // --- AuthZ: caller must be a member of the room ---
    const { data: membership } = await admin
      .from("room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load learned words (system-only access via service role)
    const { data: learnedRows } = await admin
      .from("learned_words")
      .select("word");
    const learned = new Set<string>(
      (learnedRows ?? []).map((r: { word: string }) => r.word),
    );

    const { score: msgScore, hits } = detectAbuse(content, learned);

    // Per-user score in this room
    const key = `${roomId}:${userId}`;
    const state = userScores.get(key) ?? { score: 0, muted: false };

    if (state.muted) {
      return new Response(
        JSON.stringify({ allowed: false, muted: true, reason: "muted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // Bump counts for already-known abusive terms (analytics in private table)
    for (const w of hits) {
      if (learned.has(w)) {
        await admin
          .rpc("increment_learned_word", { _word: w })
          .catch(() => {
            admin.from("learned_words").upsert(
              { word: w, count: 1 },
              { onConflict: "word", ignoreDuplicates: false },
            );
          });
      }
    }

    // Learn new candidate words: only when message had abusive context
    if (msgScore >= 3) {
      const tokens = tokenize(content);
      for (const t of tokens) {
        // Skip if already known (substring or fuzzy)
        const alreadyKnown = SEED_BAD_WORDS.some((w) =>
          t.includes(w) || lev(t, w) <= 1
        ) || learned.has(t);
        if (alreadyKnown) continue;

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
        warn:
          `⚠️ @${senderName || "User"} — please avoid abusive language. This is a warning.`,
        final:
          `🚫 @${senderName || "User"} — final warning. Continued abuse will result in a mute.`,
        mute:
          `🔇 @${senderName || "User"} has been muted for repeated abusive language.`,
      };
      await admin.from("chat_messages").insert({
        room_id: roomId,
        user_id: BOT_USER_ID,
        sender_name: BOT_NAME,
        content: messages[action],
      });

      // --- Smart intervention: room-wide warning when toxicity spikes ---
      // Query DB (stateless across edge function isolates) for recent bot
      // warnings in this room within the toxicity window.
      const windowStart = new Date(Date.now() - TOXICITY_WINDOW_MS).toISOString();
      const { data: recentBotMsgs } = await admin
        .from("chat_messages")
        .select("content, created_at")
        .eq("room_id", roomId)
        .eq("user_id", BOT_USER_ID)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(20);

      const recent = recentBotMsgs ?? [];
      // Count user-directed warnings (warn/final/mute) — those start with ⚠️ @, 🚫 @, or 🔇 @
      const warningMsgs = recent.filter((m: { content: string }) =>
        /^(⚠️|🚫|🔇)\s*@/.test(m.content)
      );
      // Distinct users mentioned in those warnings
      const mentionedUsers = new Set<string>();
      for (const m of warningMsgs) {
        const match = m.content.match(/@([A-Za-z0-9_\-\.]+)/);
        if (match) mentionedUsers.add(match[1]);
      }
      // Has a general warning been posted recently?
      const recentGeneralWarn = recent.some((m: { content: string }) =>
        m.content.startsWith("⚠️ Please keep the conversation respectful")
      );

      if (
        warningMsgs.length >= TOXICITY_THRESHOLD &&
        mentionedUsers.size >= 2 &&
        !recentGeneralWarn
      ) {
        await admin.from("chat_messages").insert({
          room_id: roomId,
          user_id: BOT_USER_ID,
          sender_name: BOT_NAME,
          content:
            "⚠️ Please keep the conversation respectful. Continued abuse may lead to restrictions for everyone.",
        });
      }
    }

    return new Response(
      JSON.stringify({
        allowed: action === "allow",
        action,
        muted: state.muted,
        score: state.score,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("moderate-message error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
