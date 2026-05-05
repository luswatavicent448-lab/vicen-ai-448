import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getTodayDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
  const fullDate = now.toLocaleDateString('en-US', options);
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const year = now.getUTCFullYear();
  const totalDays = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0) ? 366 : 365;
  const remaining = totalDays - dayOfYear;
  return `Today is ${fullDate}. It is the ${dayOfYear}th day of the year, with ${remaining} days remaining.`;
}

function buildSystemPrompt(
  settings: Record<string, unknown> | undefined,
  browsing: boolean,
  lengthOverride?: "short" | "medium" | "detailed" | "auto",
): string {
  const dateInfo = getTodayDate();
  const s = settings || {};

  const name = s.userName ? `The user's name is ${s.userName}.` : "";

  const langMap: Record<string, string> = {
    english: "English", french: "French", german: "German",
    kiswahili: "Kiswahili (Swahili)", spanish: "Spanish", arabic: "Arabic", chinese: "Chinese (Mandarin)",
  };
  const lang = langMap[(s.language as string)] || "English";
  const langRule = `You MUST respond ONLY in ${lang}. Do not mix languages unless the user explicitly asks.`;

  const toneMap: Record<string, string> = {
    friendly: "Use a casual, natural, warm tone with simple wording.",
    formal: "Use a professional, structured, and polished tone.",
    funny: "Use light humor and a playful tone, but remain respectful and accurate.",
  };
  const toneRule = toneMap[(s.tone as string)] || toneMap.friendly;

  const lengthMap: Record<string, string> = {
    short: "Keep the reply to 1–3 short sentences. No headings, no bullets unless absolutely needed. Get straight to the point.",
    medium: "Reply in 1 focused paragraph (or up to 2 short ones). Clear, natural, no filler.",
    detailed: "Give a thorough, well-structured reply. Use short paragraphs and bullet points where they genuinely help. Keep it readable, no padding.",
    auto: "Adapt length to the message: 1–2 sentences for greetings/small talk, one focused paragraph for normal questions, and a structured detailed reply only for complex or academic topics.",
  };
  const lengthKey =
    lengthOverride && lengthOverride !== "auto"
      ? lengthOverride
      : lengthOverride === "auto"
        ? "auto"
        : ((s.responseLength as string) || "auto");
  const lengthRule = lengthMap[lengthKey] || lengthMap.auto;

  const subjectMap: Record<string, string> = {
    math: "When explaining math, show step-by-step working clearly. Use numbered steps for calculations.",
    physics: "For physics, explain concepts clearly with formulas and real-world examples.",
    chemistry: "For chemistry, give factual explanations with chemical equations when relevant.",
    biology: "For biology/science topics, give factual, clear, and simple explanations.",
    history: "For history, provide factual, chronological explanations with context.",
    geography: "For geography, use clear spatial/factual explanations.",
    english: "For English language topics, provide examples and translations when helpful.",
    french: "For French language learning, provide examples and translations.",
    german: "For German language learning, provide examples and translations.",
    kiswahili: "For Kiswahili language learning, provide examples and translations.",
    entrepreneurship: "For entrepreneurship, give practical business-oriented explanations.",
    pe: "For physical education, explain techniques, rules, and health concepts clearly.",
    cre: "For CRE (Christian Religious Education), provide respectful, factual explanations.",
    ict: "For ICT/technology topics, give practical, clear explanations with examples when helpful.",
    general: "Be concise and direct in your explanations.",
  };
  const subjectRule = subjectMap[(s.subject as string)] || subjectMap.general;

  const stepRule = s.stepByStep ? "When solving problems, break them down step-by-step." : "";
  const followUp = s.followUpQuestions ? "End your response with a brief follow-up question to continue the conversation." : "Do NOT ask follow-up questions unless the user asks.";

  const filterMap: Record<string, string> = {
    strict: "Apply strict content filtering. Refuse inappropriate, harmful, or offensive requests.",
    moderate: "Apply moderate content filtering. Avoid clearly harmful content but allow mature discussion.",
    off: "",
  };
  const filterRule = filterMap[(s.contentFilter as string)] || filterMap.strict;

  const browsingRule = browsing
    ? "BROWSING MODE IS ON: You have live web search. Use the latest information from the web. Be factual and cite specific facts from sources."
    : "";

  return [
    `You are Vicen AI, a helpful and knowledgeable assistant.`,
    name,
    langRule,
    toneRule,
    `RESPONSE LENGTH RULE (MANDATORY): ${lengthRule}`,
    `SUBJECT STYLE: ${subjectRule}`,
    stepRule,
    followUp,
    filterRule,
    browsingRule,
    `VICEN AI — RESPONSE BEHAVIOR:
- Tone: natural, human, conversational. Confident but warm. Never robotic, never preachy.
- Greetings / small talk ("hi", "thanks", "ok"): reply naturally in 1–2 sentences with NO explanation.
- Concept / general questions: explain clearly and simply in clean paragraphs. Add one brief useful insight when it helps. Avoid one-line vague answers.
- Academic / problem-solving: show step-by-step working using "Step 1:", "Step 2:", etc., then a clearly separated final answer on its own line as "Final answer: <result>". Verify the math before answering.
- Ambiguous questions: briefly mention the likely interpretations or ask ONE short clarifying question — never guess silently.
- Honesty: if you don't know or can't verify, say "I'm not sure" plainly. Do not invent facts.
- Formatting (STRICT, MANDATORY): output must look like a clean handwritten/typed student answer.
  • NEVER use markdown headings (no #, ##, ###, ####).
  • NEVER use LaTeX or math delimiters ($, $$, \\(, \\), \\[, \\]). Never wrap equations in code fences.
  • NEVER use raw markup like \\frac, \\sqrt, ^{...}, _{...}. Write math in plain readable text.
  • Use Unicode for math: superscripts (², ³, ⁿ), subscripts (₁, ₂), × ÷ ± √ π θ ° ≈ ≤ ≥ ≠ → Δ.
  • Examples of correct form: "v = u + at", "s = ut + 1/2 at²", "E = mc²", "x = (-b ± √(b² - 4ac)) / 2a".
  • Avoid bold/italic markdown for normal prose. Plain sentences and short paragraphs are preferred.
  • Bullet lists are allowed only when they genuinely help (use "- " bullets), but prefer clean paragraphs and numbered "Step N:" lines for working.
- Safety: refuse harmful or dangerous requests politely in one line, give a one-line reason, and suggest a safe alternative. Do not lecture.`,
    `Current date information: ${dateInfo}`,
    `ENFORCEMENT: These settings are mandatory system rules. Never ignore length limits, tone, or language settings for any reason.`,
  ].filter(Boolean).join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, settings, browsing, lengthMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(settings, !!browsing, lengthMode);

    // When browsing is enabled, use a Gemini model with google_search grounding
    const model = browsing ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
    };

    if (browsing) {
      // Lovable AI Gateway passes Google's google_search tool through for Gemini models.
      body.tools = [{ google_search: {} }];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
