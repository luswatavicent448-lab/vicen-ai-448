import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Sparkles, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Conversation, Message } from "@/types/chat";
import { streamChat } from "@/lib/chat-stream";
import { classifyIntent } from "@/lib/time-sensitive";
import { ChatMessage, TypingIndicator, SearchingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Sidebar } from "@/components/Sidebar";
import { LoginScreen } from "@/components/LoginScreen";
import { QuickActions } from "@/components/QuickActions";
import { useSettings } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
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

function autoLengthFor(text: string): "short" | "medium" | "detailed" {
  const t = text.trim();
  const len = t.length;
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  // Greetings / very short → short
  if (len < 12 || wordCount <= 2) return "short";
  // Academic / problem-solving / multi-sentence → detailed
  if (
    len > 120 ||
    wordCount > 22 ||
    /\b(explain|why|how|prove|solve|derive|compare|difference|step[- ]by[- ]step|essay|analy[sz]e|describe in detail)\b/i.test(t) ||
    /[=+\-*/^]|\d+\s*[+\-*/x×÷]\s*\d+/.test(t)
  ) return "detailed";
  return "medium";
}

export default function ChatPage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchingLive, setSearchingLive] = useState(false);
  // Web search is always on (Firecrawl-powered)
  const browsing = true;
  const [showLogin, setShowLogin] = useState(() => !localStorage.getItem("vicen-user-mode"));
  const [userMode, setUserMode] = useState(() => localStorage.getItem("vicen-user-mode") || "");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("vicen-theme") || "dark";
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  useEffect(() => {
    // Set up listener FIRST, then check existing session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
        localStorage.setItem("vicen-user-mode", "signed-in");
        setUserMode("signed-in");
        setShowLogin(false);
      } else if (event === "SIGNED_OUT") {
        setUserEmail(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
        localStorage.setItem("vicen-user-mode", "signed-in");
        setUserMode("signed-in");
        setShowLogin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);


  const active = conversations.find((c) => c.id === activeId) || null;

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages]);

  const handleLogin = (mode: "guest" | "signed-in") => {
    localStorage.setItem("vicen-user-mode", mode);
    setUserMode(mode);
    setShowLogin(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vicen-user-mode");
    setUserMode("");
    setUserEmail(null);
    setShowLogin(true);
    toast.success("Signed out");
  };

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

    // Intent classification with context inheritance from recent user messages
    const priorTexts =
      conversations
        .find((c) => c.id === targetId)
        ?.messages.filter((m) => m.role === "user")
        .map((m) => m.content) ?? [];
    const intent = classifyIntent(text, priorTexts);

    // Ambiguous → ask ONE focused clarifying question, do not search
    if (intent === "ambiguous") {
      const userMsg: Message = { role: "user", content: text };
      const clarify: Message = {
        role: "assistant",
        content:
          "Could you tell me a bit more about what you're referring to? For example, are you asking about a news event, a sports match, or something we were just discussing?",
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== targetId
            ? c
            : {
                ...c,
                title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
                messages: [...c.messages, userMsg, clarify],
              },
        ),
      );
      return;
    }

    const effectiveBrowsing = true;
    void intent;

    const userMsg: Message = { role: "user", content: text };
    const pickedLength = autoLengthFor(text);

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c;
        const updated = { ...c, messages: [...c.messages, userMsg] };
        if (c.messages.length === 0) updated.title = text.slice(0, 40);
        return updated;
      })
    );

    setIsStreaming(true);
    if (effectiveBrowsing) setSearchingLive(true);
    let assistantContent = "";

    const currentMessages = [
      ...(conversations.find((c) => c.id === targetId)?.messages || []),
      userMsg,
    ];

    const upsertAssistant = (chunk: string) => {
      setSearchingLive(false);
      assistantContent += chunk;
      const content = assistantContent;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              content,
              variants: { ...(last.variants || {}), [pickedLength]: content },
            };
          } else {
            msgs.push({
              role: "assistant",
              content,
              lengthMode: pickedLength,
              variants: { [pickedLength]: content },
            });
          }
          return { ...c, messages: msgs };
        })
      );
    };

    const setCitations = (citations: { title: string; url: string }[]) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, citations };
          }
          return { ...c, messages: msgs };
        })
      );
    };

    try {
      await streamChat({
        messages: currentMessages,
        settings: settings as unknown as Record<string, unknown>,
        browsing: effectiveBrowsing,
        lengthMode: pickedLength,
        onDelta: upsertAssistant,
        onCitations: setCitations,
        onDone: () => { setIsStreaming(false); setSearchingLive(false); },
        onError: (err) => {
          toast.error(err);
          setIsStreaming(false);
          setSearchingLive(false);
        },
      });
    } catch {
      toast.error("Failed to connect to AI");
      setIsStreaming(false);
      setSearchingLive(false);
    }
  };

  // Regenerate the assistant message at index `assistantIdx` in the active conversation
  // using the requested length mode. The user message just before it is the prompt.
  const regenerateAt = useCallback(
    async (assistantIdx: number, mode: "short" | "medium" | "detailed") => {
      if (!active) return;
      const msgs = active.messages;
      const target = msgs[assistantIdx];
      if (!target || target.role !== "assistant") return;

      // If we already have this variant cached, just swap content
      if (target.variants?.[mode]) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== active.id
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m, i) =>
                    i === assistantIdx
                      ? { ...m, content: target.variants![mode]!, lengthMode: mode }
                      : m,
                  ),
                },
          ),
        );
        return;
      }

      // History up to (but not including) the target assistant message
      const history = msgs.slice(0, assistantIdx);
      if (history.length === 0 || history[history.length - 1].role !== "user") return;

      // Mark target as streaming (clear content for now, keep variants)
      const targetId = active.id;
      setIsStreaming(true);
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== targetId
            ? c
            : {
                ...c,
                messages: c.messages.map((m, i) =>
                  i === assistantIdx ? { ...m, content: "", lengthMode: mode } : m,
                ),
              },
        ),
      );

      let acc = "";
      try {
        await streamChat({
          messages: history,
          settings: settings as unknown as Record<string, unknown>,
          browsing: false,
          lengthMode: mode,
          onDelta: (chunk) => {
            acc += chunk;
            const content = acc;
            setConversations((prev) =>
              prev.map((c) =>
                c.id !== targetId
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m, i) =>
                        i === assistantIdx
                          ? {
                              ...m,
                              content,
                              lengthMode: mode,
                              variants: { ...(m.variants || {}), [mode]: content },
                            }
                          : m,
                      ),
                    },
              ),
            );
          },
          onCitations: () => {},
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            toast.error(err);
            setIsStreaming(false);
          },
        });
      } catch {
        toast.error("Failed to regenerate");
        setIsStreaming(false);
      }
    },
    [active, settings],
  );

  const handleDelete = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-dvh overflow-hidden transition-colors duration-300">
      {showLogin && (
        <LoginScreen
          onGuest={() => handleLogin("guest")}
          onSignedIn={() => handleLogin("signed-in")}
        />
      )}

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
        <header className="grid grid-cols-3 items-center px-4 py-3 shrink-0 glass">
          <div className="flex items-center justify-start">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors sm:hidden"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Vicen AI</span>
          </div>
          <div className="flex items-center justify-end gap-0.5">
            {userMode === "signed-in" && (
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                title={userEmail || "Sign out"}
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            )}
            <button
              onClick={() => navigate("/settings")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

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
              <QuickActions onSelect={handleSend} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {active.messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  message={m}
                  onRetry={
                    m.role === "assistant"
                      ? () => regenerateAt(i, m.lengthMode === "auto" || !m.lengthMode ? "medium" : m.lengthMode)
                      : undefined
                  }
                />
              ))}
              {isStreaming && active.messages[active.messages.length - 1]?.role === "user" && (
                searchingLive ? <SearchingIndicator /> : <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
