import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Send, Globe, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictation, toBCP47 } from "@/hooks/use-dictation";
import { useVoiceSettings } from "@/hooks/use-voice-settings";
import { toast } from "sonner";

export function ChatInput({
  onSend,
  disabled,
  browsing,
  onToggleBrowsing,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  browsing: boolean;
  onToggleBrowsing: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { voice } = useVoiceSettings();
  const baseTextRef = useRef("");

  const resize = () => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 150) + "px";
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

  return (
    <div className="border-t border-border bg-background p-3 sm:p-4">
      {dictation.listening && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
          </span>
          <span className="truncate">
            {dictation.interim
              ? `Listening… "${dictation.interim}"`
              : "Listening… speak naturally, pause when done."}
          </span>
        </div>
      )}
      <div className="max-w-3xl mx-auto flex gap-2 items-end">
        <button
          type="button"
          onClick={onToggleBrowsing}
          title={browsing ? "Browsing on — click to disable" : "Enable browsing for live web answers"}
          aria-pressed={browsing}
          className={cn(
            "shrink-0 h-10 px-3 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-all",
            browsing
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">Browse</span>
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={dictation.listening ? "Listening…" : browsing ? "Search the web..." : "Ask anything..."}
          rows={1}
          className="flex-1 resize-none bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 scrollbar-thin"
        />
        <button
          type="button"
          onClick={toggleMic}
          aria-pressed={dictation.listening}
          title={dictation.listening ? "Stop dictation" : "Start dictation"}
          className={cn(
            "relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            dictation.listening
              ? "bg-destructive text-destructive-foreground shadow-md"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          {dictation.listening && (
            <>
              <span className="absolute inset-0 rounded-xl bg-destructive/40 animate-ping" />
              <span className="absolute inset-0 rounded-xl ring-2 ring-destructive/60" />
            </>
          )}
          {dictation.listening ? (
            <MicOff className="w-4 h-4 relative" />
          ) : (
            <Mic className="w-4 h-4 relative" />
          )}
        </button>
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
