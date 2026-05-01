import { useRef } from "react";
import { Palette, Vibrate, LayoutGrid, Wrench, Image as ImageIcon, Trash2 } from "lucide-react";
import { SettingsSubPage, SettingsGroup, SettingsRow } from "@/components/SettingsSubPage";
import { useSettings } from "@/hooks/use-settings";
import { Switch } from "@/components/ui/switch";
import { ChatSettings } from "@/types/settings";
import { toast } from "sonner";

const BG_KEY = "vicen-background";

export default function GeneralPage() {
  const { settings, update, reset } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleThemeChange = (v: ChatSettings["theme"]) => {
    update("theme", v);
    document.documentElement.classList.toggle("light", v === "light");
    localStorage.setItem("vicen-theme", v);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        localStorage.setItem(BG_KEY, reader.result);
        toast.success("Background updated");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearBg = () => {
    localStorage.removeItem(BG_KEY);
    toast.success("Background cleared");
  };

  return (
    <SettingsSubPage title="General">
      {/* Appearance */}
      <SettingsGroup label="Appearance">
        <SettingsRow
          icon={Palette}
          title="Theme"
          description={settings.theme === "dark" ? "Dark" : "Light"}
          right={
            <select
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as ChatSettings["theme"])}
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          }
        />
        <SettingsRow
          title="Font size"
          right={
            <select
              value={settings.fontSize}
              onChange={(e) => update("fontSize", e.target.value as ChatSettings["fontSize"])}
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          }
        />
        <SettingsRow
          title="Tone"
          right={
            <select
              value={settings.tone}
              onChange={(e) => update("tone", e.target.value as ChatSettings["tone"])}
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="funny">Funny</option>
            </select>
          }
        />
      </SettingsGroup>

      {/* Haptics */}
      <SettingsGroup label="Haptics">
        <SettingsRow
          icon={Vibrate}
          title="Vibration"
          description="Tactile feedback for taps and toggles"
          right={<Switch checked={true} onCheckedChange={() => toast.message("Coming soon")} />}
        />
      </SettingsGroup>

      {/* Widget */}
      <SettingsGroup label="Widget">
        <SettingsRow
          icon={LayoutGrid}
          title="Home screen widget"
          description="Show quick actions on your home screen"
          onClick={() => toast.message("Widget setup coming soon")}
        />
      </SettingsGroup>

      {/* Custom Background */}
      <SettingsGroup label="Custom background">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        <SettingsRow
          icon={ImageIcon}
          title="Upload image"
          description="Set a custom chat background"
          onClick={() => fileRef.current?.click()}
        />
        <SettingsRow
          icon={Trash2}
          title="Reset background"
          onClick={clearBg}
        />
      </SettingsGroup>

      {/* Advanced */}
      <SettingsGroup label="Advanced">
        <SettingsRow
          icon={Wrench}
          title="Memory"
          description="Let Vicen remember context across chats"
          right={<Switch checked={settings.memory} onCheckedChange={(v) => update("memory", v)} />}
        />
        <SettingsRow
          title="Chat history"
          description="Save your conversations"
          right={<Switch checked={settings.chatHistory} onCheckedChange={(v) => update("chatHistory", v)} />}
        />
        <SettingsRow
          title="Follow-up questions"
          right={<Switch checked={settings.followUpQuestions} onCheckedChange={(v) => update("followUpQuestions", v)} />}
        />
        <SettingsRow
          title="Reset all settings"
          onClick={() => {
            if (confirm("Reset all settings to defaults?")) {
              reset();
              toast.success("Settings reset");
            }
          }}
        />
      </SettingsGroup>
    </SettingsSubPage>
  );
}