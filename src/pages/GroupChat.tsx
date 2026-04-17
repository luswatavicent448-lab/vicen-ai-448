import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Link as LinkIcon, Users, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

type Member = {
  id: string;
  user_id: string;
  display_name: string;
  is_typing: boolean;
  last_seen: string;
};

type Room = { id: string; name: string; created_by: string };

export default function GroupChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomId = searchParams.get("room");

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("vicen-chat-name") || ""
  );
  const [nameInput, setNameInput] = useState(displayName);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        toast.error("Please sign in to use group chat");
        navigate("/");
        return;
      }
      setUserId(session.user.id);
      if (!displayName) {
        const fallback = session.user.email?.split("@")[0] || "User";
        setNameInput(fallback);
      }
    });
  }, [navigate, displayName]);

  // Load room + join + subscribe
  useEffect(() => {
    if (!roomId || !userId || !displayName) return;
    let cancelled = false;

    (async () => {
      // Load room
      const { data: roomData, error: roomErr } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (cancelled) return;
      if (roomErr || !roomData) {
        toast.error("Room not found");
        setSearchParams({});
        return;
      }
      setRoom(roomData);

      // Join (upsert membership)
      await supabase.from("room_members").upsert(
        { room_id: roomId, user_id: userId, display_name: displayName, is_typing: false, last_seen: new Date().toISOString() },
        { onConflict: "room_id,user_id" }
      );

      // Load existing messages
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (!cancelled && msgs) setMessages(msgs);

      // Load members
      const { data: mems } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", roomId);
      if (!cancelled && mems) setMembers(mems);
    })();

    // Realtime subscriptions
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase
            .from("room_members")
            .select("*")
            .eq("room_id", roomId);
          if (data) setMembers(data);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, displayName, setSearchParams]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (roomId && userId) {
        supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
      }
    };
  }, [roomId, userId]);

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    localStorage.setItem("vicen-chat-name", trimmed);
    setDisplayName(trimmed);
  };

  const createRoom = async () => {
    if (!userId || !displayName) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_rooms")
      .insert({ name: `${displayName}'s room`, created_by: userId })
      .select()
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error("Could not create room");
      return;
    }
    setSearchParams({ room: data.id });
  };

  const copyInvite = () => {
    if (!roomId) return;
    const url = `${window.location.origin}/group-chat?room=${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!roomId || !userId) return;
      supabase
        .from("room_members")
        .update({ is_typing: typing, last_seen: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    },
    [roomId, userId]
  );

  const handleTyping = (val: string) => {
    setText(val);
    setTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setTyping(false), 1500);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !roomId || !userId) return;
    setText("");
    setTyping(false);
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: userId,
      sender_name: displayName,
      content: trimmed,
    });
    if (error) {
      toast.error("Failed to send");
      return;
    }

    // Trigger AI bot reply when mentioned, greeted, or asked a question
    const lower = trimmed.toLowerCase();
    const shouldReply =
      lower.includes("@vicen") ||
      lower.includes("hello") ||
      lower.includes("hi ") ||
      lower.startsWith("hi") ||
      trimmed.includes("?");

    if (shouldReply) {
      supabase.functions
        .invoke("group-chat-ai", {
          body: {
            roomId,
            userMessage: trimmed,
            senderName: displayName,
            history: messages.slice(-8).map((m) => ({
              sender_name: m.sender_name,
              content: m.content,
            })),
          },
        })
        .catch((err) => console.error("Bot reply failed:", err));
    }
  };

  const leaveRoom = async () => {
    if (roomId && userId) {
      await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    }
    setSearchParams({});
    setRoom(null);
    setMessages([]);
    setMembers([]);
  };

  const typingNames = members
    .filter((m) => m.is_typing && m.user_id !== userId)
    .map((m) => m.display_name);

  // ---- Render: Name prompt ----
  if (!displayName) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-center">Join Group Chat</h1>
          <p className="text-sm text-muted-foreground text-center">Choose a display name</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={saveName}
            disabled={!nameInput.trim()}
            className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            Continue
          </button>
          <button onClick={() => navigate("/")} className="w-full text-sm text-muted-foreground">
            Back
          </button>
        </div>
      </div>
    );
  }

  // ---- Render: Room lobby ----
  if (!roomId || !room) {
    return (
      <div className="h-dvh flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-base">Group Chat</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Start a chat</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create a room and share the invite link with friends to chat in real time.
          </p>
          <button
            onClick={createRoom}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Creating…" : "Create Room"}
          </button>
          <p className="text-xs text-muted-foreground">
            Joined as <span className="font-medium text-foreground">{displayName}</span>{" "}
            <button
              onClick={() => {
                localStorage.removeItem("vicen-chat-name");
                setDisplayName("");
                setNameInput("");
              }}
              className="underline"
            >
              change
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ---- Render: Chat room ----
  return (
    <div className="h-dvh flex flex-col bg-background">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={leaveRoom}
          className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"
          title="Leave room"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{room.name}</h1>
          <p className="text-xs text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <button
          onClick={() => setShowMembers((s) => !s)}
          className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"
          title="Members"
        >
          <Users className="w-4 h-4" />
        </button>
        <button
          onClick={copyInvite}
          className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center"
          title="Copy invite link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={leaveRoom}
          className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
          title="Leave"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {showMembers && (
        <div className="px-4 py-2 border-b border-border bg-secondary/30 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            In this room
          </p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <span
                key={m.id}
                className="text-xs px-2 py-1 rounded-full bg-background border border-border"
              >
                {m.display_name}
                {m.user_id === userId && " (you)"}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">
            No messages yet. Say hi 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <p className="text-xs font-semibold opacity-70 mb-0.5">{m.sender_name}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
        {typingNames.length > 0 && (
          <p className="text-xs text-muted-foreground italic">
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-border shrink-0 flex gap-2">
        <input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
