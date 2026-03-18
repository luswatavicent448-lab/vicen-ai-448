import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Sparkles, Settings } from "lucide-react";
import { Conversation, Message } from "@/types/chat";
import { streamChat } from "@/lib/chat-stream";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Sidebar } from "@/components/Sidebar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LoginScreen } from "@/components/LoginScreen";
import { QuickActions } from "@/components/QuickActions";
import { TeacherApprovalDialog } from "@/components/TeacherApproval";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("vicen-theme") as "dark" | "light") || "dark");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(() => localStorage.getItem("vicen-bg"));
  const [showLogin, setShowLogin] = useState(() => !localStorage.getItem("vicen-user-mode"));
  const [userMode, setUserMode] = useState(() => localStorage.getItem("vicen-user-mode") || "");
  const [pendingApproval, setPendingApproval] = useState<{ conversationId: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("vicen-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (backgroundImage) localStorage.setItem("vicen-bg", backgroundImage);
    else localStorage.removeItem("vicen-bg");
  }, [backgroundImage]);

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

    const finalTargetId = targetId;

    try {
      await streamChat({
        messages: currentMessages,
        onDelta: (chunk) => {
          assistantContent += chunk;
        },
        onDone: () => {
          setIsStreaming(false);
          // Show teacher approval dialog instead of directly adding message
          if (assistantContent) {
            setPendingApproval({ conversationId: finalTargetId, content: assistantContent });
          }
        },
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

  const handleApprove = () => {
    if (!pendingApproval) return;
    const { conversationId, content } = pendingApproval;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return { ...c, messages: [...c.messages, { role: "assistant", content, approved: true }] };
      })
    );
    setPendingApproval(null);
  };

  const handleReject = () => {
    if (!pendingApproval) return;
    const { conversationId } = pendingApproval;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return { ...c, messages: [...c.messages, { role: "assistant", content: "This response was rejected by the teacher.", approved: false }] };
      })
    );
    setPendingApproval(null);
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <div
      className="flex h-dvh overflow-hidden transition-colors duration-300"
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
      {showLogin && (
        <LoginScreen
          onGuest={() => handleLogin("guest")}
          onSignIn={() => handleLogin("signed-in")}
        />
      )}

      {pendingApproval && (
        <TeacherApprovalDialog
          pendingContent={pendingApproval.content}
          onApprove={handleApprove}
          onReject={handleReject}
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

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        backgroundImage={backgroundImage}
        onBackgroundChange={setBackgroundImage}
        onBackgroundClear={() => setBackgroundImage(null)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 ${backgroundImage ? "bg-background/80 backdrop-blur-md" : ""}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center sm:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-base tracking-tight">Vicen AI</span>
            {userMode && (
              <span className="text-xs text-muted-foreground ml-1">
                ({userMode === "guest" ? "Guest" : "Signed in"})
              </span>
            )}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
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
              <QuickActions onSelect={handleQuickAction} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {active.messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {isStreaming && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isStreaming || !!pendingApproval} />
      </div>
    </div>
  );
}
