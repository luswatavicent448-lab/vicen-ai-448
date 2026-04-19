import ReactMarkdown from "react-markdown";
import { ExternalLink, Globe } from "lucide-react";
import { Message } from "@/types/chat";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const hasCitations = !isUser && message.citations && message.citations.length > 0;

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-chat-user text-primary-foreground rounded-br-md"
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
