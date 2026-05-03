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
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
};

export function useDictation({
  lang,
  silenceMs = 1500,
  onFinal,
  onInterim,
  onError,
}: Options = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimer = useRef<number | null>(null);
  const finalBufRef = useRef("");

  const clearSilenceTimer = () => {
    if (silenceTimer.current) {
      window.clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimer.current = window.setTimeout(() => {
      try {
        recRef.current?.stop();
      } catch { /* noop */ }
    }, silenceMs);
  }, [silenceMs]);

  const stop = useCallback(() => {
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

    rec.onstart = () => {
      setListening(true);
      armSilenceTimer();
    };
    rec.onresult = (e: SREvent) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) {
          finalBufRef.current += (finalBufRef.current ? " " : "") + txt.trim();
        } else {
          interimText += txt;
        }
      }
      setInterim(interimText);
      if (interimText) onInterim?.(interimText);
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
      const final = finalBufRef.current.trim();
      if (final) onFinal?.(final);
      finalBufRef.current = "";
      recRef.current = null;
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