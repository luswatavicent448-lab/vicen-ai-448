import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Note = {
  id: string;
  title: string;
  content: string;
  subject: string;
  created_at: string;
};

export default function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("general");
  const [loading, setLoading] = useState(true);

  const subjects = [
    "general", "math", "physics", "chemistry", "biology",
    "history", "geography", "english", "french", "german",
    "kiswahili", "entrepreneurship", "pe", "cre", "ict",
  ];

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Load from localStorage for guests
      const local = JSON.parse(localStorage.getItem("vicen-notes") || "[]");
      setNotes(local);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load notes");
    else setNotes(data || []);
    setLoading(false);
  };

  const saveNote = async () => {
    if (!content.trim()) return;
    const noteTitle = title.trim() || content.slice(0, 40);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const note: Note = { id: Date.now().toString(), title: noteTitle, content, subject, created_at: new Date().toISOString() };
      const local = [note, ...JSON.parse(localStorage.getItem("vicen-notes") || "[]")];
      localStorage.setItem("vicen-notes", JSON.stringify(local));
      setNotes(local);
    } else {
      const { error } = await supabase.from("notes").insert({ user_id: user.id, title: noteTitle, content, subject });
      if (error) { toast.error("Failed to save note"); return; }
      await fetchNotes();
    }
    setTitle("");
    setContent("");
    toast.success("Note saved!");
  };

  const deleteNote = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const local = JSON.parse(localStorage.getItem("vicen-notes") || "[]").filter((n: Note) => n.id !== id);
      localStorage.setItem("vicen-notes", JSON.stringify(local));
      setNotes(local);
    } else {
      await supabase.from("notes").delete().eq("id", id);
      await fetchNotes();
    }
    toast.success("Note deleted");
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <StickyNote className="w-5 h-5 text-primary" />
        <h1 className="text-base font-semibold">Notes</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title (optional)" className="h-9 text-sm" />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notes..." rows={4} className="text-sm resize-none" />
          <div className="flex items-center gap-2">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-secondary text-secondary-foreground border-none rounded-md px-3 py-1.5 text-sm flex-1">
              {subjects.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={saveNote} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground text-sm">Loading...</p>
        ) : notes.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">No notes yet. Start writing!</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{n.title}</h3>
                    <span className="text-xs text-primary/70 capitalize">{n.subject}</span>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.content}</p>
                  </div>
                  <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
