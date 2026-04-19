import { useState, useRef, KeyboardEvent } from "react";
import { Send, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 150) + "px";
    }
  };

  return (
    <div className="border-t border-border bg-background p-3 sm:p-4">
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
          placeholder={browsing ? "Search the web..." : "Ask anything..."}
          rows={1}
          className="flex-1 resize-none bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 scrollbar-thin"
        />
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
