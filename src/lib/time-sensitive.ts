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
