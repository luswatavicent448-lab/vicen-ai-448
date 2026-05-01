import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, User, Shield, Cloud, Bell, Heart, LogOut } from "lucide-react";
import { SettingsSubPage } from "@/components/SettingsSubPage";
import { AccountSection } from "@/components/AccountSection";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

function Collapse({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/30 transition-colors"
      >
        <Icon className="w-[22px] h-[22px] text-muted-foreground" />
        <span className="flex-1 text-left text-foreground font-medium text-sm">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-1 border-t border-border/40">{children}</div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [cloudBackup, setCloudBackup] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
      setCreatedAt(session?.user?.created_at ?? null);
    });
  }, []);

  const accountAge = createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000))
    : null;

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to sign out?")) return;
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Sign out failed");
    else toast.success("Signed out");
  };

  return (
    <SettingsSubPage title="Account">
      {/* Profile header card */}
      <div className="bg-card rounded-2xl p-5 flex items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)] ring-1 ring-primary/20">
        <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center ring-2 ring-primary/40">
          <span className="text-2xl font-semibold text-primary-foreground">
            {(email?.[0] ?? "G").toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold uppercase tracking-wide text-foreground truncate">
            {email ? email.split("@")[0] : "Guest"}
          </p>
          <p className="text-sm text-muted-foreground truncate">{email ?? "Not signed in"}</p>
        </div>
      </div>

      <Collapse icon={User} title="Profile" defaultOpen>
        <AccountSection />
      </Collapse>

      <Collapse icon={Shield} title="Privacy & Security">
        <div className="space-y-2 text-sm">
          <button className="w-full text-left py-2 text-foreground hover:text-primary transition-colors">
            Change password
          </button>
          <button className="w-full text-left py-2 text-foreground hover:text-primary transition-colors">
            Two-factor authentication
          </button>
          <button className="w-full text-left py-2 text-foreground hover:text-primary transition-colors">
            Request my data
          </button>
          <button className="w-full text-left py-2 text-destructive hover:brightness-110 transition-colors">
            Delete account
          </button>
        </div>
      </Collapse>

      <Collapse icon={Cloud} title="Sync & Backup">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-foreground">Cloud backup</p>
              <p className="text-xs text-muted-foreground">Sync chats across devices</p>
            </div>
            <Switch checked={cloudBackup} onCheckedChange={setCloudBackup} />
          </div>
          <p className="text-xs text-muted-foreground">Last sync: just now</p>
          <button
            onClick={() => toast.success("Sync started")}
            className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Sync now
          </button>
        </div>
      </Collapse>

      <Collapse icon={Bell} title="Notifications">
        <p className="text-sm text-muted-foreground">
          Manage notification preferences from the Notifications settings page.
        </p>
      </Collapse>

      <Collapse icon={Heart} title="Support & Account Health">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account age</span>
            <span className="text-foreground">{accountAge ? `${accountAge} days` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Backup status</span>
            <span className="text-foreground">{cloudBackup ? "Active" : "Off"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Security warnings</span>
            <span className="text-foreground">None</span>
          </div>
        </div>
      </Collapse>

      {email && (
        <button
          onClick={handleLogout}
          className="w-full bg-card rounded-2xl px-4 py-4 flex items-center gap-3 text-destructive hover:bg-secondary/30 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        >
          <LogOut className="w-[22px] h-[22px]" />
          <span className="font-medium text-sm">Sign out</span>
        </button>
      )}
    </SettingsSubPage>
  );
}