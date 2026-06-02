// Heuristic detector for time-sensitive questions that benefit from live web browsing.
// Kept intentionally simple & fast — runs on the client before each send.

const TIME_WORDS = [
  "today", "tonight", "tomorrow", "yesterday", "now", "current", "currently",
  "latest", "recent", "recently", "this week", "this month", "this year",
  "right now", "live", "breaking",
];

const TOPIC_WORDS = [
  // News / events
  "news", "headline", "headlines", "happening", "update", "updates",
  // Weather
  "weather", "forecast", "temperature", "rain", "snow", "storm", "humidity",
  // Markets / prices
  "price", "prices", "stock", "stocks", "shares", "market", "crypto",
  "bitcoin", "btc", "ethereum", "eth", "exchange rate", "forex", "usd", "eur",
  // Sports
  "score", "scores", "result", "results", "match", "fixture", "game",
  "standings", "league", "premier league", "nba", "nfl", "fifa", "world cup",
  // Travel / status
  "flight", "traffic", "delay",
  // Releases
  "released", "release date", "launched", "launch date",
];

const QUESTION_PATTERNS = [
  /\bwho (won|is winning|is leading)\b/i,
  /\bwhat('?s| is) (the )?(score|price|weather|forecast|news)\b/i,
  /\bhow (much|many) (is|are|does)\b.*\b(cost|worth|priced)\b/i,
  /\bwhen (is|does|did)\b.*\b(release|launch|start|begin|happen)\b/i,
];

export function isTimeSensitive(text: string): boolean {
  const q = text.toLowerCase();

  if (QUESTION_PATTERNS.some((re) => re.test(text))) return true;

  const hasTime = TIME_WORDS.some((w) => q.includes(w));
  const hasTopic = TOPIC_WORDS.some((w) => q.includes(w));

  // Strong signals: a topic word alone (e.g. "bitcoin price", "weather in Nairobi")
  // or a time word + any question marker.
  if (hasTopic) return true;
  if (hasTime && /\?|what|when|how|who/i.test(text)) return true;

  return false;
}

// --- Intent classification (Web Search & Intelligence v3.0) ---

export type QueryIntent = "time_sensitive" | "stable_factual" | "conversational" | "ambiguous";

const CONVERSATIONAL_PATTERNS = [
  /^\s*(hi|hey|hello|yo|sup|hola|howdy)\b/i,
  /^\s*(thanks|thank you|thx|ty)\b/i,
  /^\s*(ok|okay|cool|nice|great|lol|haha)\b/i,
  /^\s*(bye|goodbye|see ya|cya)\b/i,
];

const AMBIGUOUS_PATTERNS = [
  /^\s*what happened\??\s*$/i,
  /^\s*(any )?news\??\s*$/i,
  /^\s*tell me more\??\s*$/i,
  /^\s*and\??\s*$/i,
];

const CHANGE_WORDS = [
  "released", "launched", "announced", "updated", "version", "winner",
  "score", "scored", "ceo", "elected", "appointed",
];

/**
 * Classify a single message with optional prior-message context inheritance.
 * `priorTexts` is recent conversation (oldest → newest) used to inherit context
 * for follow-ups like "who scored?" after a sports discussion.
 */
export function classifyIntent(text: string, priorTexts: string[] = []): QueryIntent {
  const t = text.trim();
  if (!t) return "conversational";

  // Very short pure conversational
  if (CONVERSATIONAL_PATTERNS.some((re) => re.test(t)) && t.split(/\s+/).length <= 3) {
    return "conversational";
  }

  // Ambiguous follow-ups with no clear topic
  if (AMBIGUOUS_PATTERNS.some((re) => re.test(t))) {
    // Inherit context: if recent messages were time-sensitive, treat as time-sensitive
    const inherited = priorTexts.slice(-4).some((p) => isTimeSensitive(p));
    return inherited ? "time_sensitive" : "ambiguous";
  }

  if (isTimeSensitive(t)) return "time_sensitive";

  const q = t.toLowerCase();
  if (CHANGE_WORDS.some((w) => q.includes(w))) return "time_sensitive";

  // Inherit time-sensitive context for short follow-ups
  if (t.split(/\s+/).length <= 6 && priorTexts.slice(-3).some((p) => isTimeSensitive(p))) {
    return "time_sensitive";
  }

  return "stable_factual";
}
