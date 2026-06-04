import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { adminCall, ADMIN_TOKEN_KEY } from "@/lib/admin-api";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await adminCall<{ token: string }>("login", { username, password, keepSignedIn: keep });
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      toast.success("Admin System unlocked");
      navigate("/admin");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 animate-fade-in">
      <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Admin System</h1>
          <p className="text-xs text-muted-foreground">Restricted access</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            autoComplete="off"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-secondary/40 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/60"
            required
          />
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              autoComplete="off"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/40 border border-border/40 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary/60"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            Keep me signed in
          </label>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Unlock
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}