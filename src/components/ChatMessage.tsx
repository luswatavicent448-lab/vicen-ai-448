import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { VicenImageCards } from "@/components/VicenImageCards";

export function ChatMessage({
  message,
  onRetry,
}: {
  message: Message;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  const hasCitations = !isUser && message.citations && message.citations.length > 0;
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          className={`text-[15px] leading-[1.65] ${
            isUser
              ? "px-5 py-3 rounded-[22px] rounded-br-lg bg-primary text-primary-foreground inline-block shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)]"
              : "px-1 py-1 text-foreground"
          }`}
        >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  hr: () => (
                    <hr className="my-5 border-0 h-px bg-border/60" />
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="not-prose my-4 rounded-lg border-l-[3px] border-primary bg-secondary/40 px-4 py-3 [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_p:last-child]:mb-0">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="not-prose my-4 w-full overflow-x-auto rounded-lg border border-border">
                      <table className="w-full border-collapse text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-secondary/70">{children}</thead>
                  ),
                  tr: ({ children }) => (
                    <tr className="border-b border-border last:border-0 even:bg-secondary/20">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="border-r border-border last:border-0 px-3 py-2 text-left font-semibold">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border-r border-border last:border-0 px-3 py-2 align-top">{children}</td>
                  ),
                  p: ({ children, ...props }) => {
                    const text = Array.isArray(children)
                      ? children.map((c) => (typeof c === "string" ? c : "")).join("")
                      : typeof children === "string"
                        ? children
                        : "";
                    if (text.trimStart().startsWith("✅ Final Answer")) {
                      return (
                        <p className="not-prose my-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-medium text-emerald-300">
                          {children}
                        </p>
                      );
                    }
                    return <p {...props}>{children}</p>;
                  },
                  ul: ({ children }) => (
                    <ul className="my-2 list-disc pl-5 leading-[1.8] [&>li]:my-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 list-decimal pl-5 leading-[1.8] [&>li]:my-0.5">{children}</ol>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {message.images && message.images.length > 0 && (
              <VicenImageCards images={message.images} />
            )}
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
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-up">
      <div className="px-1 py-2 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/70"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SearchingIndicator({ label = "Checking live data…" }: { label?: string }) {
  return (
    <div className="flex justify-start animate-fade-up">
      <div className="px-3 py-2 flex gap-2 items-center rounded-full bg-primary/10 text-primary text-xs font-medium">
        <Globe className="w-3.5 h-3.5 animate-pulse" />
        <span>{label}</span>
      </div>
    </div>
  );
}
