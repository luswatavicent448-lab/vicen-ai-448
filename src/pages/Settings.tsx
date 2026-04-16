import { ArrowLeft, User, Brain, Shield, BookOpen, Palette, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/use-settings";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ChatSettings } from "@/types/settings";

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
  const { settings, update, reset } = useSettings();

  // Apply theme live
  const handleThemeChange = (v: ChatSettings["theme"]) => {
    update("theme", v);
    document.documentElement.classList.toggle("light", v === "light");
    localStorage.setItem("vicen-theme", v);
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold">Settings</h2>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Section icon={User} title="Personalization">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground">Name</span>
            <Input
              value={settings.userName}
              onChange={(e) => update("userName", e.target.value)}
              placeholder="Enter name"
              className="w-40 h-8 text-sm"
            />
          </div>
          <SelectField
            label="Language"
            value={settings.language}
            options={[{ value: "english", label: "English" }, { value: "french", label: "French" }, { value: "german", label: "German" }, { value: "kiswahili", label: "Kiswahili" }, { value: "spanish", label: "Spanish" }, { value: "arabic", label: "Arabic" }, { value: "chinese", label: "Chinese" }]}
            onChange={(v) => update("language", v as ChatSettings["language"])}
          />
          <SelectField
            label="Tone"
            value={settings.tone}
            options={[{ value: "friendly", label: "Friendly" }, { value: "formal", label: "Formal" }, { value: "funny", label: "Funny" }]}
            onChange={(v) => update("tone", v as ChatSettings["tone"])}
          />
        </Section>

        <Section icon={Brain} title="AI Behavior">
          <SelectField
            label="Response Length"
            value={settings.responseLength}
            options={[{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "detailed", label: "Detailed" }]}
            onChange={(v) => update("responseLength", v as ChatSettings["responseLength"])}
          />
          <ToggleField label="Follow-up Questions" checked={settings.followUpQuestions} onChange={(v) => update("followUpQuestions", v)} />
        </Section>

        <Section icon={Shield} title="Privacy & Safety">
          <ToggleField label="Chat History" checked={settings.chatHistory} onChange={(v) => update("chatHistory", v)} />
          <SelectField
            label="Content Filter"
            value={settings.contentFilter}
            options={[{ value: "strict", label: "Strict" }, { value: "moderate", label: "Moderate" }, { value: "off", label: "Off" }]}
            onChange={(v) => update("contentFilter", v as ChatSettings["contentFilter"])}
          />
        </Section>

        <Section icon={BookOpen} title="Learning Mode">
          <SelectField
            label="Subject"
            value={settings.subject}
            options={[
              { value: "general", label: "General" }, { value: "math", label: "Mathematics" },
              { value: "physics", label: "Physics" }, { value: "chemistry", label: "Chemistry" },
              { value: "biology", label: "Biology" }, { value: "history", label: "History" },
              { value: "geography", label: "Geography" }, { value: "english", label: "English" },
              { value: "french", label: "French" }, { value: "german", label: "German" },
              { value: "kiswahili", label: "Kiswahili" }, { value: "entrepreneurship", label: "Entrepreneurship" },
              { value: "pe", label: "Physical Education" }, { value: "cre", label: "CRE" },
              { value: "ict", label: "ICT" },
            ]}
            onChange={(v) => update("subject", v as ChatSettings["subject"])}
          />
          <ToggleField label="Step-by-Step Solutions" checked={settings.stepByStep} onChange={(v) => update("stepByStep", v)} />
        </Section>

        <Section icon={Palette} title="Appearance">
          <SelectField
            label="Theme"
            value={settings.theme}
            options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
            onChange={(v) => handleThemeChange(v as ChatSettings["theme"])}
          />
          <SelectField
            label="Font Size"
            value={settings.fontSize}
            options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]}
            onChange={(v) => update("fontSize", v as ChatSettings["fontSize"])}
          />
        </Section>

        <Section icon={Wrench} title="Advanced">
          <ToggleField label="Memory" checked={settings.memory} onChange={(v) => update("memory", v)} />
          <div className="pt-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Reset All Settings
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
