import { useState, useEffect } from "react";
import { ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Paper = {
  id: string;
  subject: string;
  file_name: string;
  file_url: string;
};

const subjects = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Geography", "English", "French",
  "German", "Kiswahili", "Entrepreneurship", "ICT", "CRE", "PE",
];

export default function PastPapersPage() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [subject, setSubject] = useState("Mathematics");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPapers(); }, []);

  const fetchPapers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPapers(JSON.parse(localStorage.getItem("vicen-papers") || "[]"));
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("past_papers").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load papers");
    else setPapers(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) { toast.error("Only PDF files allowed"); return; }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Store as data URL for guests
      const reader = new FileReader();
      reader.onload = (ev) => {
        const paper: Paper = { id: Date.now().toString(), subject, file_name: file.name, file_url: ev.target?.result as string };
        const local = [paper, ...JSON.parse(localStorage.getItem("vicen-papers") || "[]")];
        localStorage.setItem("vicen-papers", JSON.stringify(local));
        setPapers(local);
        toast.success("Paper saved locally!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("papers").upload(filePath, file);
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("papers").getPublicUrl(filePath);

    const { error } = await supabase.from("past_papers").insert({
      user_id: user.id, subject, file_name: file.name, file_url: urlData.publicUrl,
    });
    if (error) { toast.error("Failed to save paper record"); setUploading(false); return; }

    await fetchPapers();
    toast.success("Paper uploaded!");
    setUploading(false);
  };

  const deletePaper = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const local = JSON.parse(localStorage.getItem("vicen-papers") || "[]").filter((p: Paper) => p.id !== id);
      localStorage.setItem("vicen-papers", JSON.stringify(local));
      setPapers(local);
    } else {
      await supabase.from("past_papers").delete().eq("id", id);
      await fetchPapers();
    }
    toast.success("Paper deleted");
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Past Papers</h2>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-secondary text-secondary-foreground border-none rounded-md px-3 py-2 text-sm">
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="w-4 h-4" />
            <span className="text-sm">{uploading ? "Uploading..." : "Upload PDF"}</span>
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
          </label>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground text-sm">Loading...</p>
        ) : papers.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">No papers uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {papers.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.file_name}</p>
                  <span className="text-xs text-primary/70">{p.subject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open</a>
                  <button onClick={() => deletePaper(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
