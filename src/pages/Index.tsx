import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Sparkles, Settings } from "lucide-react";
import { Conversation, Message } from "@/types/chat";
import { streamChat } from "@/lib/chat-stream";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Sidebar } from "@/components/Sidebar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { toast } from "sonner";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem("vicen-conversations") || "[]");
  } catch { return []; }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem("vicen-conversations", JSON.stringify(convos));
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) || null;

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages]);

  const createConversation = useCallback((firstMessage?: string): string => {
    const id = generateId();
    const convo: Conversation = {
      id,
      title: firstMessage?.slice(0, 40) || "New chat",
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [convo, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const handleSend = async (text: string) => {
    let targetId = activeId;
    if (!targetId) {
      targetId = createConversation(text);
    }

    const userMsg: Message = { role: "user", content: text };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c;
        const updated = { ...c, messages: [...c.messages, userMsg] };
        if (c.messages.length === 0) updated.title = text.slice(0, 40);
        return updated;
      })
    );

    setIsStreaming(true);
    let assistantContent = "";

    const currentMessages = [
      ...(conversations.find((c) => c.id === targetId)?.messages || []),
      userMsg,
    ];

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      const content = assistantContent;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content };
          } else {
            msgs.push({ role: "assistant", content });
          }
          return { ...c, messages: msgs };
        })
      );
    };

    try {
      await streamChat({
        messages: currentMessages,
        onDelta: upsertAssistant,
        onDone: () => setIsStreaming(false),
        onError: (err) => {
          toast.error(err);
          setIsStreaming(false);
        },
      });
    } catch {
      toast.error("Failed to connect to AI");
      setIsStreaming(false);
    }
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={() => { setActiveId(null); }}
        onDelete={handleDelete}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center sm:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-base tracking-tight">Vicen AI</span>
          </div>
        </header>

        {/* Messages or Welcome */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!active || active.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">What can I help with?</h1>
              <p className="text-muted-foreground text-sm max-w-sm">
                Ask me anything — homework, coding, ideas, explanations. I'll give you clear, thoughtful answers.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {active.messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {isStreaming && active.messages[active.messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
