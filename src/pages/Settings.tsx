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
  BookLock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useRef, useState } from "react";
import { toast } from "sonner";

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
      { id: "knowledge", title: "Private Knowledge", subtitle: "Upload .md / .json used silently by Vicen", icon: BookLock, route: "/settings/knowledge" },
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const { email, displayName, avatarUrl, initial } = useUserProfile();
  const shownName = displayName || (email ? email.split("@")[0] : "Guest User");
  const tapsRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const [tapHint, setTapHint] = useState<string | null>(null);

  const handleVersionTap = () => {
    tapsRef.current += 1;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      tapsRef.current = 0;
      setTapHint(null);
    }, 1500);

    if (tapsRef.current === 5) {
      if ("vibrate" in navigator) navigator.vibrate(20);
      setTapHint("Keep going…");
    } else if (tapsRef.current === 6) {
      setTapHint("1 more…");
    } else if (tapsRef.current >= 7) {
      tapsRef.current = 0;
      setTapHint(null);
      if ("vibrate" in navigator) navigator.vibrate([20, 30, 40]);
      const token = localStorage.getItem("vicen-admin-token");
      if (token) {
        toast.message("Admin System already enabled.");
        navigate("/admin");
      } else {
        navigate("/admin/login");
      }
    }
  };

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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/80 flex items-center justify-center ring-2 ring-border">
                  <span className="text-2xl font-semibold text-primary-foreground">{initial}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold uppercase tracking-wide text-foreground truncate">{shownName}</p>
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

        <button
          onClick={handleVersionTap}
          className="block mx-auto text-center text-xs text-muted-foreground pt-4 select-none"
          aria-label="App version"
        >
          Vicen AI · 1.0.0
          {tapHint && <span className="block text-[10px] text-primary/70 mt-0.5">{tapHint}</span>}
        </button>
      </div>
    </div>
  );
}
