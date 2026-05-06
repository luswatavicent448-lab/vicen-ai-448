import { Citation, Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type ParsedDelta = {
  content?: string;
  citations?: Citation[];
};

function extractCitations(parsed: any): Citation[] | undefined {
  // Gemini grounding metadata may appear on choices[0].delta or .message
  const choice = parsed?.choices?.[0];
  const grounding =
    choice?.delta?.grounding_metadata ||
    choice?.message?.grounding_metadata ||
    choice?.grounding_metadata ||
    parsed?.grounding_metadata;

  // Standard OpenAI-style annotations / citations
  const annotations =
    choice?.delta?.annotations ||
    choice?.message?.annotations ||
    choice?.delta?.citations ||
    choice?.message?.citations;

  const out: Citation[] = [];

  if (grounding?.grounding_chunks) {
    for (const c of grounding.grounding_chunks) {
      const web = c?.web;
      if (web?.uri) out.push({ url: web.uri, title: web.title || web.uri });
    }
  }

  if (Array.isArray(annotations)) {
    for (const a of annotations) {
      const url = a?.url || a?.url_citation?.url || a?.web?.uri;
      const title = a?.title || a?.url_citation?.title || a?.web?.title || url;
      if (url) out.push({ url, title });
    }
  }

  if (out.length === 0) return undefined;
  // dedupe
  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

export async function streamChat({
  messages,
  settings,
  browsing,
  lengthMode,
  onDelta,
  onCitations,
  onDone,
  onError,
}: {
  messages: Message[];
  settings?: Record<string, unknown>;
  browsing?: boolean;
  lengthMode?: "short" | "medium" | "detailed" | "auto";
  onDelta: (text: string) => void;
  onCitations?: (citations: Citation[]) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, settings, browsing: !!browsing, lengthMode }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => null);
    onError(data?.error || "Failed to connect to AI");
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
        const citations = extractCitations(parsed);
        if (citations && onCitations) onCitations(citations);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}
