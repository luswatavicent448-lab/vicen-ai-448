import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (vendor-prefixed in most browsers)
type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

function getRecognitionCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isDictationSupported(): boolean {
  return !!getRecognitionCtor();
}

type Options = {
  lang?: string; // BCP-47, e.g. "en-US", "fr-FR", "sw-KE". Empty/auto -> browser default.
  silenceMs?: number; // Auto-stop after this much trailing silence
  minSpeechMs?: number; // Minimum speaking duration before we accept a final
  sendDelayMs?: number; // Extra "thinking buffer" before committing the final
  requireCompleteSentence?: boolean; // Avoid stopping on dangling connectors
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
};

export function useDictation({
  lang,
  silenceMs = 1700,
  minSpeechMs = 900,
  sendDelayMs = 500,
  requireCompleteSentence = true,
  onFinal,
  onInterim,
  onError,
}: Options = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimer = useRef<number | null>(null);
  const finalBufRef = useRef("");
  const startedAtRef = useRef<number>(0);
  const manualStopRef = useRef<boolean>(false);

  const clearSilenceTimer = () => {
    if (silenceTimer.current) {
      window.clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const looksIncomplete = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    if (!t) return true;
    // Ends with a connector / filler word → likely still speaking
    const danglers = [
      "and","or","but","so","because","cause","that","which","with",
      "to","of","for","from","in","on","at","is","are","was","were",
      "the","a","an","my","your","like","then","when","while","if",
    ];
    const last = t.replace(/[.,!?;:]+$/, "").split(/\s+/).pop() || "";
    if (danglers.includes(last)) return true;
    // Very short single-word fragments
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 2) return true;
    return false;
  };

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimer.current = window.setTimeout(() => {
      // Only auto-stop if we have enough speech AND the sentence looks complete
      const speakingFor = Date.now() - startedAtRef.current;
      const buffered = (finalBufRef.current + " " + (recRef.current ? "" : "")).trim();
      if (speakingFor < minSpeechMs) {
        // Not enough speech yet — wait another beat
        armSilenceTimer();
        return;
      }
      if (requireCompleteSentence && looksIncomplete(buffered)) {
        // Likely a natural pause — keep listening a bit longer
        armSilenceTimer();
        return;
      }
      // Thinking buffer: small extra delay before actually stopping
      window.setTimeout(() => {
        try { recRef.current?.stop(); } catch { /* noop */ }
      }, sendDelayMs);
    }, silenceMs);
  }, [silenceMs, minSpeechMs, sendDelayMs, requireCompleteSentence]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    clearSilenceTimer();
    try { recRef.current?.stop(); } catch { /* noop */ }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onError?.("Speech recognition is not supported in this browser.");
      return;
    }
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* noop */ }
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    if (lang) rec.lang = lang;

    finalBufRef.current = "";
    setInterim("");
    manualStopRef.current = false;
    startedAtRef.current = Date.now();

    rec.onstart = () => {
      setListening(true);
      startedAtRef.current = Date.now();
      armSilenceTimer();
    };
    rec.onresult = (e: SREvent) => {
      // Rebuild final + interim from the FULL results list every event.
      // This avoids duplicate concatenation when browsers re-emit results
      // (e.g. Chrome continuous mode) and guarantees interim *replaces*
      // rather than appends.
      const finals: string[] = [];
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = (r[0].transcript || "").trim();
        if (!txt) continue;
        if (r.isFinal) finals.push(txt);
        else interimText += (interimText ? " " : "") + txt;
      }
      // Dedupe consecutive repeated phrases (e.g. "what what is" → "what is")
      const dedupe = (s: string) =>
        s.replace(/\b(\w+(?:\s+\w+){0,4})\s+\1\b/gi, "$1").replace(/\s+/g, " ").trim();
      finalBufRef.current = dedupe(finals.join(" "));
      interimText = dedupe(interimText);
      setInterim(interimText);
      if (interimText) onInterim?.(interimText);
      // Voice command: "stop listening"
      const combined = (finalBufRef.current + " " + interimText).toLowerCase();
      if (/\b(stop listening|stop dictation)\b/.test(combined)) {
        // Strip the command from the final buffer
        finalBufRef.current = finalBufRef.current
          .replace(/\bstop listening\b/gi, "")
          .replace(/\bstop dictation\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        manualStopRef.current = true;
        clearSilenceTimer();
        try { recRef.current?.stop(); } catch { /* noop */ }
        return;
      }
      armSilenceTimer();
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      onError?.(e.error || "Dictation error");
    };
    rec.onend = () => {
      clearSilenceTimer();
      setListening(false);
      setInterim("");
      const dedupe = (s: string) =>
        s.replace(/\b(\w+(?:\s+\w+){0,4})\s+\1\b/gi, "$1").replace(/\s+/g, " ").trim();
      const final = dedupe(finalBufRef.current);
      // Drop fragments that are too short unless user manually stopped
      const words = final.split(/\s+/).filter(Boolean);
      if (final && (manualStopRef.current || words.length >= 2)) {
        onFinal?.(final);
      }
      finalBufRef.current = "";
      recRef.current = null;
      manualStopRef.current = false;
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to start dictation");
    }
  }, [lang, armSilenceTimer, onFinal, onInterim, onError]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      try { recRef.current?.abort(); } catch { /* noop */ }
    };
  }, []);

  return { listening, interim, start, stop, supported: isDictationSupported() };
}

// Map our internal language codes to BCP-47 for SpeechRecognition.
export function toBCP47(code: string | undefined): string | undefined {
  switch (code) {
    case "en": return "en-US";
    case "fr": return "fr-FR";
    case "sw": return "sw-KE";
    case "es": return "es-ES";
    case "ar": return "ar-SA";
    case "auto":
    case undefined:
    case "":
      return undefined;
    default: return code;
  }
}