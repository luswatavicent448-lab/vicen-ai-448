import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Copy, Users, LogOut, Plus, Lock, Globe, KeyRound, Mic, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  message_type?: string | null;
  attachment_url?: string | null;
  attachment_duration_ms?: number | null;
};

type Member = {
  id: string;
  user_id: string;
  display_name: string;
  is_typing: boolean;
  last_seen: string;
};

type Room = {
  id: string;
  name: string;
  created_by: string;
  code: string;
  is_private: boolean;
};

type LobbyView = "menu" | "create" | "join";

export default function GroupChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const codeParam = searchParams.get("code");

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

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const recordAutoStopRef = useRef<number | null>(null);

  // Lobby state
  const [lobbyView, setLobbyView] = useState<LobbyView>("menu");
  const [createPrivate, setCreatePrivate] = useState(false);
  const [createPassword, setCreatePassword] = useState("");
  const [joinCode, setJoinCode] = useState(codeParam?.toUpperCase() || "");
  const [joinPassword, setJoinPassword] = useState("");

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

  // If arriving with ?code=XXXX (and no room yet), prefill join view
  useEffect(() => {
    if (codeParam && !roomId && displayName) {
      setLobbyView("join");
      setJoinCode(codeParam.toUpperCase());
    }
  }, [codeParam, roomId, displayName]);

  // Load room + subscribe (membership is created via RPC, not here)
  useEffect(() => {
    if (!roomId || !userId || !displayName) return;
    let cancelled = false;

    (async () => {
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
      setRoom(roomData as Room);

      // Touch membership timestamp (must already be a member via RPC)
      await supabase
        .from("room_members")
        .update({ last_seen: new Date().toISOString(), display_name: displayName })
        .eq("room_id", roomId)
        .eq("user_id", userId);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (!cancelled && msgs) setMessages(msgs);

      const { data: mems } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", roomId);
      if (!cancelled && mems) setMembers(mems);
    })();

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  const handleCreateRoom = async () => {
    if (!userId || !displayName) return;
    if (createPrivate && !createPassword.trim()) {
      toast.error("Please set a password for the private room");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("create_room_with_code", {
      _name: `${displayName}'s room`,
      _is_private: createPrivate,
      _password: createPrivate ? createPassword : null,
      _display_name: displayName,
    });
    setLoading(false);
    if (error || !data || !data[0]) {
      toast.error(error?.message || "Could not create room");
      return;
    }
    toast.success(`Room created! Code: ${data[0].code}`);
    setCreatePassword("");
    setSearchParams({ room: data[0].id });
  };

  const handleJoinRoom = async () => {
    if (!userId || !displayName) return;
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a room code");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("join_room_with_code", {
      _code: code,
      _password: joinPassword || null,
      _display_name: displayName,
    });
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message || "Could not join room");
      return;
    }
    setJoinPassword("");
    setSearchParams({ room: data as string });
  };

  const copyInvite = () => {
    if (!room) return;
    const url = `${window.location.origin}/group-chat?code=${room.code}`;
    navigator.clipboard.writeText(url);
    toast.success(`Invite link copied! Code: ${room.code}`);
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    toast.success("Code copied!");
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
    setLobbyView("menu");
  };

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordAutoStopRef.current) {
      window.clearTimeout(recordAutoStopRef.current);
      recordAutoStopRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    if (!roomId || !userId || recording || uploadingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not supported on this device");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordStartRef.current = Date.now();
      setRecordSeconds(0);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const duration = Date.now() - recordStartRef.current;
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (chunks.length === 0 || duration < 500) {
          toast.message("Recording too short");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const ext = (recorder.mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm";
        const path = `${userId}/${roomId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        setUploadingVoice(true);
        const { error: upErr } = await supabase.storage
          .from("voice-messages")
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (upErr) {
          setUploadingVoice(false);
          toast.error("Upload failed");
          return;
        }
        const { data: pub } = supabase.storage.from("voice-messages").getPublicUrl(path);
        const { error: insErr } = await supabase.from("chat_messages").insert({
          room_id: roomId,
          user_id: userId,
          sender_name: displayName,
          content: "🎤 Voice message",
          message_type: "voice",
          attachment_url: pub.publicUrl,
          attachment_duration_ms: duration,
        });
        setUploadingVoice(false);
        if (insErr) toast.error("Failed to send voice");
      };

      recorder.start();
      setRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 250);
      // Auto-stop after 60s
      recordAutoStopRef.current = window.setTimeout(() => stopRecording(), 60_000);
    } catch (err) {
      console.error(err);
      toast.error("Microphone permission denied");
    }
  };

  const formatDuration = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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

  // ---- Render: Lobby (menu / create / join) ----
  if (!roomId || !room) {
    return (
      <div className="h-dvh flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={() => (lobbyView === "menu" ? navigate("/") : setLobbyView("menu"))}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-base">
            {lobbyView === "create" ? "Create Room" : lobbyView === "join" ? "Join Room" : "Group Chat"}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {lobbyView === "menu" && (
            <div className="max-w-sm mx-auto flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-center">Start chatting</h2>
              <p className="text-sm text-muted-foreground text-center">
                Create a room or join one with a code.
              </p>
              <button
                onClick={() => setLobbyView("create")}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                <Plus className="w-4 h-4" /> Create Room
              </button>
              <button
                onClick={() => setLobbyView("join")}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary text-foreground font-medium border border-border"
              >
                <KeyRound className="w-4 h-4" /> Join with Code
              </button>
              <p className="text-xs text-muted-foreground mt-2">
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
          )}

          {lobbyView === "create" && (
            <div className="max-w-sm mx-auto space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Choose a room type. You'll get a 6-character code to share.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCreatePrivate(false)}
                  className={`px-3 py-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-1 ${
                    !createPrivate
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary border-border text-foreground"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Public
                </button>
                <button
                  onClick={() => setCreatePrivate(true)}
                  className={`px-3 py-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-1 ${
                    createPrivate
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary border-border text-foreground"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>
              {createPrivate && (
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Set a password 🔑"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {loading ? "Creating…" : `Create ${createPrivate ? "Private" : "Public"} Room`}
              </button>
            </div>
          )}

          {lobbyView === "join" && (
            <div className="max-w-sm mx-auto space-y-4">
              <p className="text-sm text-muted-foreground text-center">Enter your access code ✨</p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Room Code"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center font-mono text-lg uppercase"
              />
              <input
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Password (if private)"
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleJoinRoom}
                disabled={loading || !joinCode.trim()}
                className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {loading ? "Joining…" : "Join 🚀"}
              </button>
            </div>
          )}
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
          <div className="flex items-center gap-1.5">
            <h1 className="font-semibold text-sm truncate">{room.name}</h1>
            {room.is_private ? (
              <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <button
            onClick={copyCode}
            className="text-xs text-muted-foreground font-mono hover:text-foreground"
            title="Copy room code"
          >
            {room.code} · {members.length} {members.length === 1 ? "member" : "members"}
          </button>
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
          <Copy className="w-4 h-4" />
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
            const isBot = m.sender_name?.startsWith("VICEN AI");
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : isBot
                      ? "bg-accent/30 text-foreground border border-primary/30 rounded-bl-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <p className={`text-xs font-semibold mb-0.5 ${isBot ? "text-primary" : "opacity-70"}`}>
                      {m.sender_name}
                    </p>
                  )}
                  {m.message_type === "voice" && m.attachment_url ? (
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <audio
                        controls
                        src={m.attachment_url}
                        className="w-full h-9"
                        preload="metadata"
                      />
                      {m.attachment_duration_ms ? (
                        <span className={`text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatDuration(m.attachment_duration_ms)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  )}
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

      <div className="p-3 border-t border-border shrink-0 flex gap-2 items-center">
        {recording ? (
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/40">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">
              Recording… {formatDuration(recordSeconds * 1000)}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">Tap stop to send</span>
          </div>
        ) : (
          <input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={uploadingVoice ? "Sending voice…" : "Type a message…"}
            disabled={uploadingVoice}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60"
          />
        )}

        {!recording && !text.trim() ? (
          <button
            onClick={startRecording}
            disabled={uploadingVoice}
            className="w-11 h-11 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center disabled:opacity-50"
            title="Record voice message"
            aria-label="Record voice message"
          >
            <Mic className="w-4 h-4" />
          </button>
        ) : recording ? (
          <button
            onClick={stopRecording}
            className="w-11 h-11 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center animate-pulse"
            title="Stop and send"
            aria-label="Stop recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!text.trim() || uploadingVoice}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
