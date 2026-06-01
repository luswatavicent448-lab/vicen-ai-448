import { useEffect, useState } from "react";
import { Upload, Trash2, FileText, Lock, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { SettingsSubPage, SettingsGroup } from "@/components/SettingsSubPage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_BYTES = 200_000; // ~200 KB cap to keep prompts tight

type BlockedChunk = { text: string; reason: string };
type ClassifyResult = { allowed: string; blocked: BlockedChunk[] };

const REASON_LABELS: Record<string, string> = {
  world_fact: "General world fact",
  political_or_country: "Political / country claim",
  ai_instruction: "AI behavior instruction",
  third_party: "About someone else",
  code: "Code or technical snippet",
  other: "Not personal information",
};

export default function KnowledgePage() {
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"md" | "json">("md");
  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [lastReview, setLastReview] = useState<ClassifyResult | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("private_knowledge")
        .select("content, kind, filename")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        setContent(data.content || "");
        setKind((data.kind as "md" | "json") || "md");
        setFilename(data.filename);
      }
      setLoading(false);
    })();
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(`File too large. Max ${Math.round(MAX_BYTES / 1000)} KB.`);
      return;
    }
    const ext = file.name.toLowerCase().endsWith(".json") ? "json" : "md";
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (ext === "json") {
        try { JSON.parse(text); } catch { toast.error("Invalid JSON"); return; }
      }
      setContent(text);
      setKind(ext);
      setFilename(file.name);
      toast.success("Loaded — remember to Save");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in first"); return; }
    if (content.length > MAX_BYTES) { toast.error("Content too large"); return; }
    if (kind === "json" && content.trim()) {
      try { JSON.parse(content); } catch { toast.error("Invalid JSON"); return; }
    }
    setSaving(true);
    setClassifying(true);
    setLastReview(null);
    // Run the personal-only safety classifier first.
    const { data: result, error: classifyErr } = await supabase.functions.invoke<ClassifyResult>(
      "classify-knowledge",
      { body: { content } },
    );
    setClassifying(false);
    if (classifyErr || !result) {
      setSaving(false);
      toast.error("Safety check unavailable. Please try again.");
      return;
    }
    setLastReview(result);
    const cleaned = (result.allowed || "").trim();
    if (!cleaned) {
      setSaving(false);
      toast.error("Nothing personal was found. Only personal info about you can be stored.");
      return;
    }
    const { error } = await supabase
      .from("private_knowledge")
      .upsert(
        { user_id: u.user.id, content: cleaned, kind, filename },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setContent(cleaned);
    if (result.blocked.length > 0) {
      toast.success(`Saved. ${result.blocked.length} non-personal item(s) were removed.`);
    } else {
      toast.success("Private knowledge saved");
    }
  };

  const clear = async () => {
    if (!confirm("Delete your private knowledge base?")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("private_knowledge").delete().eq("user_id", u.user.id);
    setContent(""); setFilename(null); setKind("md");
    toast.success("Cleared");
  };

  return (
    <SettingsSubPage title="Private Knowledge">
      <SettingsGroup label="About">
        <div className="px-4 py-3 text-sm text-muted-foreground flex gap-3">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Store ONLY personal info about you — name, school, grade, subject preferences,
            learning style, profile notes. Vicen AI uses it silently to personalize answers.
            Your data is isolated per account; no one else can read it.
            General facts, opinions, country claims, and AI instructions are automatically blocked.
          </p>
        </div>
      </SettingsGroup>

      <SettingsGroup label="Source">
        <div className="px-4 py-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="file" accept=".md,.json,text/markdown,application/json" className="hidden" onChange={onFile} />
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm">
              <Upload className="w-4 h-4" /> Upload file
            </span>
            {filename && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {filename}
              </span>
            )}
          </label>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Format:</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "md" | "json")}
              className="bg-secondary text-secondary-foreground rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="md">Markdown</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup label="Content">
        <div className="px-4 py-3 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder={kind === "json" ? '{ "facts": ["..."] }' : "# My private notes\n\n- Fact A\n- Fact B"}
            className="w-full min-h-[260px] bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length.toLocaleString()} / {MAX_BYTES.toLocaleString()} chars</span>
            <div className="flex gap-2">
              <button
                onClick={clear}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={save}
                disabled={saving || classifying}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {classifying ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
                  </span>
                ) : saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </SettingsGroup>

      {lastReview && (
        <SettingsGroup label="Safety review">
          <div className="px-4 py-3 space-y-3 text-sm">
            <div className="flex items-start gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                {lastReview.allowed.trim()
                  ? "Personal info accepted and stored."
                  : "No personal info detected."}
              </p>
            </div>
            {lastReview.blocked.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{lastReview.blocked.length} item(s) blocked</span>
                </div>
                <ul className="space-y-1.5">
                  {lastReview.blocked.map((b, i) => (
                    <li key={i} className="rounded-lg border border-border bg-background/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        {REASON_LABELS[b.reason] || "Not personal"}
                      </div>
                      <div className="text-foreground/90 break-words">"{b.text}"</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SettingsGroup>
      )}
    </SettingsSubPage>
  );
}