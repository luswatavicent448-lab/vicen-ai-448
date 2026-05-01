import { useEffect, useState } from "react";
import { Loader2, Check, X, Pencil } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(50, "Name must be 50 characters or less");

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(255, "Email is too long");

export function ProfileEditor() {
  const [email, setEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    const sync = (user: any) => {
      if (!user) return;
      setEmail(user.email ?? null);
      setPendingEmail(user.new_email ?? null);
      const meta = user.user_metadata ?? {};
      const name =
        meta.display_name ||
        meta.full_name ||
        meta.name ||
        (user.email ? user.email.split("@")[0] : "");
      setDisplayName(name);
    };
    supabase.auth.getUser().then(({ data }) => sync(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => sync(s?.user));
    return () => subscription.unsubscribe();
  }, []);

  const startEditName = () => {
    setNameInput(displayName);
    setEditingName(true);
  };

  const saveName = async () => {
    const parsed = nameSchema.safeParse(nameInput);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSavingName(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: parsed.data, full_name: parsed.data },
    });
    setSavingName(false);
    if (error) {
      toast.error(error.message || "Could not update name");
      return;
    }
    setDisplayName(parsed.data);
    setEditingName(false);
    toast.success("Name updated");
    void data;
  };

  const startEditEmail = () => {
    setEmailInput(email ?? "");
    setEditingEmail(true);
  };

  const saveEmail = async () => {
    const parsed = emailSchema.safeParse(emailInput);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data === email) {
      setEditingEmail(false);
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: parsed.data },
      { emailRedirectTo: window.location.origin }
    );
    setSavingEmail(false);
    if (error) {
      toast.error(error.message || "Could not update email");
      return;
    }
    setPendingEmail(parsed.data);
    setEditingEmail(false);
    toast.success("Confirmation sent — check your new email to confirm the change");
  };

  if (!email) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to edit your profile.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Display name */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Display name</label>
        {editingName ? (
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={50}
              autoFocus
              disabled={savingName}
              className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
            />
            <button
              onClick={saveName}
              disabled={savingName}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50"
              aria-label="Save name"
            >
              {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditingName(false)}
              disabled={savingName}
              className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-50"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={startEditName}
            className="w-full mt-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <span className="text-sm text-foreground truncate">{displayName || "Add a name"}</span>
            <Pencil className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
        {editingEmail ? (
          <div className="flex gap-2 mt-1">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              maxLength={255}
              autoFocus
              autoComplete="email"
              disabled={savingEmail}
              className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
            />
            <button
              onClick={saveEmail}
              disabled={savingEmail}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50"
              aria-label="Save email"
            >
              {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditingEmail(false)}
              disabled={savingEmail}
              className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-50"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={startEditEmail}
            className="w-full mt-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <span className="text-sm text-foreground truncate">{email}</span>
            <Pencil className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}
        {pendingEmail && pendingEmail !== email && (
          <p className="text-xs text-primary mt-1.5">
            Pending confirmation: {pendingEmail}. Check that inbox to confirm the change.
          </p>
        )}
      </div>
    </div>
  );
}