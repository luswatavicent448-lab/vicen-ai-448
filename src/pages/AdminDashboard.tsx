import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Image as ImageIcon, BookOpen, BarChart3, ScrollText, UserCog, Upload, Trash2, Pencil,
  Loader2, Search, Plus, X, Power,
} from "lucide-react";
import { adminCall, getAdminToken, clearAdminToken } from "@/lib/admin-api";
import { toast } from "sonner";

type Tab = "images" | "knowledge" | "stats" | "logs" | "account";

type ImgRow = { id: string; title: string; description: string; category: string; sub_category: string; tags: string[]; url: string; thumbnail_url: string; is_active: boolean; country: string };
type KnowRow = { id: string; topic: string; raw_content: string; context_summary: string; is_active: boolean; created_at: string; categories: string[] };
type LogRow = { id: string; admin_name: string; action: string; target: string; topic: string; timestamp: string };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("images");
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) { navigate("/admin/login"); return; }
    adminCall<{ ok: boolean; username: string }>("verify")
      .then((r) => { setUsername(r.username); setReady(true); })
      .catch(() => { clearAdminToken(); navigate("/admin/login"); });
  }, [navigate]);

  const logout = async () => {
    try { await adminCall("logout"); } catch { /* ignore */ }
    clearAdminToken();
    toast.success("Signed out of admin");
    navigate("/");
  };

  if (!ready) {
    return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "knowledge", label: "Knowledge", icon: BookOpen },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "logs", label: "Logs", icon: ScrollText },
    { id: "account", label: "Account", icon: UserCog },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Admin System</h1>
          <p className="text-[11px] text-muted-foreground">Signed in as {username}</p>
        </div>
        <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>

      <nav className="flex overflow-x-auto px-2 gap-1 border-b border-border/40 sticky top-[57px] z-10 bg-background/95 backdrop-blur">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {tab === "images" && <ImagesTab />}
        {tab === "knowledge" && <KnowledgeTab />}
        {tab === "stats" && <StatsTab />}
        {tab === "logs" && <LogsTab />}
        {tab === "account" && <AccountTab onUsernameChange={setUsername} />}
      </main>
    </div>
  );
}

/* ---------- IMAGES ---------- */
function ImagesTab() {
  const [items, setItems] = useState<ImgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<ImgRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminCall<{ images: ImgRow[] }>("image_list", { search });
      setItems(r.images);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try { await adminCall("image_delete", { id }); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleActive = async (img: ImgRow) => {
    try { await adminCall("image_update", { id: img.id, is_active: !img.is_active }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images…"
            className="w-full bg-secondary/40 border border-border/40 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <button onClick={() => setShowUpload(true)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-8" /> : (
        items.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No images yet.</p> :
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((img) => (
            <div key={img.id} className={`rounded-lg overflow-hidden border border-border/50 bg-card/40 ${!img.is_active ? "opacity-50" : ""}`}>
              <div className="aspect-square bg-secondary/40 relative">
                <img src={img.thumbnail_url || img.url} alt={img.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium line-clamp-1">{img.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{img.category}{img.sub_category ? ` · ${img.sub_category}` : ""}</p>
                <div className="flex gap-1 pt-1">
                  <button onClick={() => setEditing(img)} className="flex-1 text-[10px] py-1 rounded bg-secondary/60 hover:bg-secondary flex items-center justify-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                  <button onClick={() => toggleActive(img)} className="text-[10px] py-1 px-1.5 rounded bg-secondary/60 hover:bg-secondary" title={img.is_active ? "Disable" : "Enable"}><Power className="w-3 h-3" /></button>
                  <button onClick={() => remove(img.id)} className="text-[10px] py-1 px-1.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
      {editing && <EditImageModal img={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", tags: "", category: "general", sub_category: "", country: "", url: "" });
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    const r = new FileReader();
    r.onload = () => setDataUrl(r.result as string);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (!dataUrl && !form.url.trim()) { toast.error("Upload a file or paste a URL"); return; }
    setBusy(true);
    try {
      await adminCall("image_upload", { ...form, dataUrl: dataUrl || undefined, url: form.url || undefined });
      toast.success("Image added");
      onDone();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <Modal onClose={onClose} title="Add Image">
      <div className="space-y-3">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary/60">
          {dataUrl ? (
            <img src={dataUrl} alt="preview" className="max-h-32 rounded" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload (max 10MB)</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </label>
        <Input placeholder="Or paste image URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
        <Input placeholder="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input placeholder="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <Input placeholder="Sub-category" value={form.sub_category} onChange={(v) => setForm({ ...form, sub_category: v })} />
        </div>
        <Input placeholder="Country (optional)" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
        <button onClick={submit} disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </div>
    </Modal>
  );
}

function EditImageModal({ img, onClose, onDone }: { img: ImgRow; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    title: img.title, description: img.description || "",
    tags: (img.tags || []).join(", "),
    category: img.category, sub_category: img.sub_category || "", country: img.country || "",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await adminCall("image_update", { id: img.id, ...form });
      toast.success("Updated"); onDone();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };
  return (
    <Modal onClose={onClose} title="Edit Image">
      <div className="space-y-3">
        <img src={img.thumbnail_url || img.url} alt={img.title} className="max-h-32 rounded mx-auto" />
        <Input placeholder="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input placeholder="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <Input placeholder="Tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <Input placeholder="Sub-category" value={form.sub_category} onChange={(v) => setForm({ ...form, sub_category: v })} />
        </div>
        <Input placeholder="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
        <button onClick={submit} disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </div>
    </Modal>
  );
}

/* ---------- KNOWLEDGE ---------- */
function KnowledgeTab() {
  const [items, setItems] = useState<KnowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<KnowRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminCall<{ knowledge: KnowRow[] }>("knowledge_list", { search });
      setItems(r.knowledge);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this knowledge entry?")) return;
    try { await adminCall("knowledge_delete", { id }); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const toggle = async (k: KnowRow) => {
    try { await adminCall("knowledge_update", { id: k.id, is_active: !k.is_active }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search knowledge…" className="w-full bg-secondary/40 border border-border/40 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-primary/60" />
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-8" /> : (
        items.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No knowledge yet.</p> :
        <div className="space-y-2">
          {items.map((k) => (
            <div key={k.id} className={`bg-card/40 border border-border/40 rounded-lg p-3 ${!k.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{k.topic || "(no topic)"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{k.context_summary || k.raw_content?.slice(0, 140)}</p>
                  {k.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {k.categories.slice(0, 4).map((c, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60">{c}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditing(k)} className="p-1.5 rounded bg-secondary/60 hover:bg-secondary"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggle(k)} className="p-1.5 rounded bg-secondary/60 hover:bg-secondary"><Power className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(k.id)} className="p-1.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <KnowledgeModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {editing && <KnowledgeModal entry={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function KnowledgeModal({ entry, onClose, onDone }: { entry?: KnowRow; onClose: () => void; onDone: () => void }) {
  const [topic, setTopic] = useState(entry?.topic || "");
  const [content, setContent] = useState(entry?.raw_content || "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!content.trim()) { toast.error("Content required"); return; }
    setBusy(true);
    try {
      if (entry) await adminCall("knowledge_update", { id: entry.id, topic, content });
      else await adminCall("knowledge_add", { topic, content });
      toast.success(entry ? "Updated" : "Added — AI processing complete");
      onDone();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };
  return (
    <Modal onClose={onClose} title={entry ? "Edit Knowledge" : "Add Knowledge"}>
      <div className="space-y-3">
        <Input placeholder="Topic (optional)" value={topic} onChange={setTopic} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste raw content — facts, articles, notes. Vicen AI will extract entities & facts automatically."
          className="w-full bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/60 min-h-[200px]"
        />
        <button onClick={submit} disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </div>
    </Modal>
  );
}

/* ---------- STATS ---------- */
function StatsTab() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    adminCall<Record<string, number>>("stats").then(setStats).catch((e) => toast.error(e.message));
  }, []);
  if (!stats) return <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-8" />;
  const cards = [
    { label: "Total images", value: stats.total_images },
    { label: "Active", value: stats.active_images },
    { label: "Disabled", value: stats.disabled_images },
    { label: "Uploads today", value: stats.uploads_today },
    { label: "Edits today", value: stats.edits_today },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card/40 border border-border/40 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="text-2xl font-bold mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- LOGS ---------- */
function LogsTab() {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  useEffect(() => { adminCall<{ logs: LogRow[] }>("logs").then((r) => setLogs(r.logs)).catch((e) => toast.error(e.message)); }, []);
  if (!logs) return <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-8" />;
  if (logs.length === 0) return <p className="text-center text-sm text-muted-foreground py-8">No activity yet.</p>;
  return (
    <div className="space-y-1.5">
      {logs.map((l) => (
        <div key={l.id} className="bg-card/40 border border-border/40 rounded-lg px-3 py-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="font-medium">{l.action}</span>
            <span className="text-muted-foreground shrink-0">{new Date(l.timestamp).toLocaleString()}</span>
          </div>
          {(l.target || l.topic) && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1">{l.target || l.topic}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- ACCOUNT ---------- */
function AccountTab({ onUsernameChange }: { onUsernameChange: (u: string) => void }) {
  const [currentPassword, setCurrent] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async () => {
    if (!currentPassword) { toast.error("Enter current password"); return; }
    if (!newUsername && !newPassword) { toast.error("Nothing to change"); return; }
    setBusy(true);
    try {
      await adminCall("update_credentials", { currentPassword, newUsername: newUsername || undefined, newPassword: newPassword || undefined });
      toast.success("Credentials updated — please log in again.");
      clearAdminToken();
      if (newUsername) onUsernameChange(newUsername);
      navigate("/admin/login");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };
  return (
    <div className="space-y-3 max-w-sm">
      <p className="text-xs text-muted-foreground">Change your admin credentials. Re-login required after saving.</p>
      <Input type="password" placeholder="Current password *" value={currentPassword} onChange={setCurrent} />
      <Input placeholder="New username (optional)" value={newUsername} onChange={setNewUsername} />
      <Input type="password" placeholder="New password (optional, min 8)" value={newPassword} onChange={setNewPassword} />
      <button onClick={submit} disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Update
      </button>
    </div>
  );
}

/* ---------- shared ---------- */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 sticky top-0 bg-card">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/60"
      autoComplete="off"
    />
  );
}