import { useEffect, useState } from "react";
import {
  X,
  ChevronRight,
  User as UserIcon,
  Settings as SettingsIcon,
  Mic,
  Brain,
  Bell,
  Info,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Category = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  route: string;
};

const GROUPS: { label: string; items: Category[] }[] = [
  {
    label: "Account",
    items: [
      { id: "account", title: "Account", subtitle: "Profile, security, sync", icon: UserIcon, route: "/settings/account" },
    ],
  },
  {
    label: "General",
    items: [
      { id: "general", title: "General", subtitle: "Appearance, haptics, widgets", icon: SettingsIcon, route: "/settings/general" },
    ],
  },
  {
    label: "Voice",
    items: [
      { id: "voice", title: "Voice", subtitle: "Voice studio, dictation", icon: Mic, route: "/settings/voice" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "ai", title: "AI Controls", subtitle: "Reasoning, memory, safety", icon: Brain, route: "/settings/ai" },
    ],
  },
  {
    label: "Notifications",
    items: [
      { id: "notifications", title: "Notifications", subtitle: "Push and in-app alerts", icon: Bell, route: "/settings/notifications" },
    ],
  },
  {
    label: "Information",
    items: [
      { id: "about", title: "About & Legal", subtitle: "Terms, privacy, licenses", icon: Info, route: "/settings/about" },
      { id: "support", title: "Support", subtitle: "Report a problem", icon: LifeBuoy, route: "/settings/support" },
    ],
  },
];

function SelectField<K extends keyof ChatSettings>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: ChatSettings[K]) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ChatSettings[K])}
        className="bg-secondary text-secondary-foreground border-none rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-1">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const initial = (email?.[0] ?? "G").toUpperCase();
  const displayName = email ? email.split("@")[0] : "Guest User";

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">
        {/* Profile Card */}
        <button
          onClick={() => navigate(email ? "/settings/account" : "/")}
          className="w-full bg-card rounded-2xl p-4 flex items-center gap-4 hover:bg-card/80 transition-colors text-left shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        >
          {email ? (
            <>
              <div className="w-14 h-14 rounded-full bg-primary/80 flex items-center justify-center ring-2 ring-border">
                <span className="text-2xl font-semibold text-primary-foreground">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold uppercase tracking-wide text-foreground truncate">{displayName}</p>
                <p className="text-sm text-muted-foreground truncate">{email}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center ring-2 ring-border">
                <UserIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Guest User</p>
                <p className="text-sm text-primary">Sign in to Vicen AI</p>
              </div>
            </>
          )}
        </button>

        {/* Premium upsell card */}
        <div className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">SuperVicen</p>
            <p className="text-xs text-muted-foreground">Premium Vicen Services</p>
          </div>
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">
            Upgrade
          </button>
        </div>

        {/* Grouped category list */}
        {GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <h3 className="text-sm text-muted-foreground px-1">{group.label}</h3>
            <div className="bg-card rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              {group.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-secondary/40 transition-colors ${
                      i !== group.items.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <Icon className="w-[22px] h-[22px] text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-center text-xs text-muted-foreground pt-4">Vicen AI · 1.0.0</p>
      </div>
    </div>
  );
}
