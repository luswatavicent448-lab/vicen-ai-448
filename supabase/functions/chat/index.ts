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

function buildSystemPrompt(settings: Record<string, unknown> | undefined): string {
  const dateInfo = getTodayDate();
  const s = settings || {};

  const name = s.userName ? `The user's name is ${s.userName}.` : "";

  // Language
  const langMap: Record<string, string> = {
    english: "English", french: "French", german: "German",
    kiswahili: "Kiswahili (Swahili)", spanish: "Spanish", arabic: "Arabic", chinese: "Chinese (Mandarin)",
  };
  const lang = langMap[(s.language as string)] || "English";
  const langRule = `You MUST respond ONLY in ${lang}. Do not mix languages unless the user explicitly asks.`;

  // Tone
  const toneMap: Record<string, string> = {
    friendly: "Use a casual, natural, warm tone with simple wording.",
    formal: "Use a professional, structured, and polished tone.",
    funny: "Use light humor and a playful tone, but remain respectful and accurate.",
  };
  const toneRule = toneMap[(s.tone as string)] || toneMap.friendly;

  // Response length
  const lengthMap: Record<string, string> = {
    short: "Your response MUST be 1–3 sentences maximum. No extra explanation. Even for greetings, keep it to 1–3 sentences.",
    medium: "Your response MUST be exactly 1 paragraph. Do not exceed one paragraph. Even for greetings, keep it to 1 paragraph.",
    detailed: "You may give a detailed explanation, but avoid unnecessary filler. Stay focused and thorough.",
  };
  const lengthRule = lengthMap[(s.responseLength as string)] || lengthMap.medium;

  // Subject
  const subjectMap: Record<string, string> = {
    math: "When explaining math, show step-by-step working clearly. Use numbered steps for calculations.",
    biology: "For biology/science topics, give factual, clear, and simple explanations.",
    ict: "For ICT/technology topics, give practical, clear explanations with examples when helpful.",
    general: "Be concise and direct in your explanations.",
  };
  const subjectRule = subjectMap[(s.subject as string)] || subjectMap.general;

  // Step by step
  const stepRule = s.stepByStep ? "When solving problems, break them down step-by-step." : "";

  // Follow-up questions
  const followUp = s.followUpQuestions ? "End your response with a brief follow-up question to continue the conversation." : "Do NOT ask follow-up questions unless the user asks.";

  // Content filter
  const filterMap: Record<string, string> = {
    strict: "Apply strict content filtering. Refuse inappropriate, harmful, or offensive requests.",
    moderate: "Apply moderate content filtering. Avoid clearly harmful content but allow mature discussion.",
    off: "",
  };
  const filterRule = filterMap[(s.contentFilter as string)] || filterMap.strict;

  return [
    `You are Vicen AI, a helpful and knowledgeable assistant.`,
    name,
    langRule,
    toneRule,
    `RESPONSE LENGTH RULE (MANDATORY — override all other behavior): ${lengthRule}`,
    `SUBJECT STYLE: ${subjectRule}`,
    stepRule,
    followUp,
    filterRule,
    `Answer in clear paragraph form. Avoid bullet points or headings unless specifically asked.`,
    `Current date information: ${dateInfo}`,
    `ENFORCEMENT: These settings are mandatory system rules. Never ignore length limits, tone, or language settings for any reason.`,
  ].filter(Boolean).join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, settings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(settings);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
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
