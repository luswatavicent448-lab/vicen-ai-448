import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Mic, MicOff, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictation, toBCP47 } from "@/hooks/use-dictation";
import { useVoiceSettings } from "@/hooks/use-voice-settings";
import { toast } from "sonner";
import { PlusMenu } from "@/components/PlusMenu";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { voice } = useVoiceSettings();
  const baseTextRef = useRef("");

  // Auto-expand up to ~5 lines, then scroll internally.
  // 18px font-size × ~1.5 line-height ≈ 27px per line; 5 lines ≈ 135px.
  const MAX_HEIGHT = 140;
  const resize = () => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      const next = Math.min(el.scrollHeight, MAX_HEIGHT);
      el.style.height = next + "px";
      el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    }
  };

  const dictation = useDictation({
    lang: toBCP47(voice.dictationLanguage),
    silenceMs: voice.silenceStop ? 1500 : 8000,
    onInterim: (interim) => {
      const next = (baseTextRef.current + (baseTextRef.current ? " " : "") + interim).trimStart();
      setText(next);
      requestAnimationFrame(resize);
    },
    onFinal: (finalText) => {
      const next = (baseTextRef.current + (baseTextRef.current ? " " : "") + finalText).trimStart();
      baseTextRef.current = next;
      setText(next);
      requestAnimationFrame(resize);
    },
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Microphone access denied. Enable it in your browser settings.");
      } else {
        toast.error("Dictation error: " + err);
      }
    },
  });

  useEffect(() => {
    return () => { try { dictation.stop(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause the mic while the AI is responding/speaking — prevents the
  // model's audio (or TTS) from being re-transcribed back into the input.
  useEffect(() => {
    if (disabled && dictation.listening) {
      try { dictation.stop(); } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Also pause while the browser's speechSynthesis is talking (read-aloud).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const id = window.setInterval(() => {
      if (window.speechSynthesis.speaking && dictation.listening) {
        try { dictation.stop(); } catch { /* noop */ }
      }
    }, 400);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.listening]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (dictation.listening) dictation.stop();
    onSend(trimmed);
    setText("");
    baseTextRef.current = "";
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => resize();

  const toggleMic = () => {
    if (!dictation.supported) {
      toast.error("Dictation isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    baseTextRef.current = text.trim();
    dictation.start();
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      {dictation.listening && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 text-xs text-white/60">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="truncate">
            {dictation.interim
              ? `Listening… "${dictation.interim}"`
              : "Listening… speak naturally, pause when done."}
          </span>
        </div>
      )}
      <div className="max-w-3xl mx-auto rounded-[28px] border border-[#2A2A2A] bg-[#0D0D0D] px-3 pt-3 pb-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={dictation.listening ? "Listening…" : "Chat with Vicen.."}
          rows={1}
          className="w-full resize-none bg-transparent text-white placeholder:text-[#8A8A8A] text-[18px] leading-[1.4] px-1 pb-2 focus:outline-none scrollbar-thin"
          style={{ overflowY: "hidden" }}
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          <PlusMenu />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={dictation.listening}
              title={dictation.listening ? "Stop dictation" : "Start dictation"}
              className={cn(
                "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                dictation.listening
                  ? "bg-red-500 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {dictation.listening ? (
                <MicOff className="w-[22px] h-[22px]" />
              ) : (
                <Mic className="w-[22px] h-[22px]" />
              )}
            </button>
            <button
              type="button"
              onClick={hasText ? handleSend : toggleMic}
              disabled={disabled}
              aria-label={hasText ? "Send message" : "Voice mode"}
              className={cn(
                "shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all",
                hasText
                  ? "bg-[#3B82F6] text-white hover:brightness-110"
                  : "bg-white text-black hover:bg-white/90",
                "disabled:opacity-40"
              )}
            >
              <AudioLines className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
