import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ExternalLink,
  Globe,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Share2,
  RotateCcw,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Message } from "@/types/chat";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LengthMode = "short" | "medium" | "detailed" | "auto";

export function ChatMessage({
  message,
  onRetry,
  onSetLength,
}: {
  message: Message;
  onRetry?: () => void;
  onSetLength?: (mode: "short" | "medium" | "detailed") => void;
}) {
  const isUser = message.role === "user";
  const hasCitations = !isUser && message.citations && message.citations.length > 0;
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentMode: LengthMode = message.lengthMode || "auto";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech not supported");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(message.content);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const handleShare = async () => {
    const data = { title: "Vicen AI", text: message.content };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(message.content);
        toast.success("Copied — share anywhere");
      }
    } catch { /* user cancelled */ }
  };

  const handleSearchWeb = () => {
    const q = message.content.slice(0, 200);
    window.open("https://www.google.com/search?q=" + encodeURIComponent(q), "_blank");
  };

  const lengthBtn = (mode: "short" | "medium" | "detailed", label: string) => (
    <button
      onClick={() => onSetLength?.(mode)}
      className={cn(
        "px-2.5 py-1 text-[11px] rounded-md transition-colors",
        currentMode === mode
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  const iconBtn = (
    Icon: typeof Copy,
    onClick: () => void,
    label: string,
    active = false,
  ) => (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}
    >
      <div className={`max-w-[85%] ${isUser ? "" : "w-full"}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-chat-user text-primary-foreground rounded-br-md inline-block"
              : "bg-chat-bot text-foreground rounded-bl-md"
          }`}
        >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {hasCitations && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                  <Globe className="w-3 h-3" />
                  <span>Sources</span>
                </div>
                <ul className="space-y-1">
                  {message.citations!.map((c, i) => (
                    <li key={i}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1.5 text-xs text-primary hover:underline break-all"
                      >
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{c.title || c.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        </div>
        {!isUser && message.content && (
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            {iconBtn(copied ? Check : Copy, handleCopy, copied ? "Copied" : "Copy", copied)}
            {iconBtn(ThumbsUp, () => setVote(vote === "up" ? null : "up"), "Good response", vote === "up")}
            {iconBtn(ThumbsDown, () => setVote(vote === "down" ? null : "down"), "Bad response", vote === "down")}
            {iconBtn(speaking ? VolumeX : Volume2, handleSpeak, speaking ? "Stop" : "Read aloud", speaking)}
            {iconBtn(Share2, handleShare, "Share")}
            {onRetry && iconBtn(RotateCcw, onRetry, "Regenerate")}
            <div className="relative">
              {iconBtn(MoreHorizontal, () => setMenuOpen((o) => !o), "More")}
              {menuOpen && (
                <div className="absolute z-10 top-full mt-1 left-0 bg-popover border border-border rounded-md shadow-lg py-1 text-xs min-w-[180px]">
                  <button
                    onClick={() => { setMenuOpen(false); handleSearchWeb(); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5" /> Search on web
                  </button>
                  {onRetry && (
                    <button
                      onClick={() => { setMenuOpen(false); onRetry(); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry
                    </button>
                  )}
                </div>
              )}
            </div>
            {onSetLength && (
              <div className="ml-auto flex items-center gap-1">
                {lengthBtn("short", "Short")}
                {lengthBtn("medium", "Medium")}
                {lengthBtn("detailed", "Detailed")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-up">
      <div className="bg-chat-bot px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
