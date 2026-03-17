import { useRef } from "react";
import { X, Sun, Moon, Image, Trash2 } from "lucide-react";

export function SettingsPanel({
  open,
  onClose,
  theme,
  onThemeChange,
  backgroundImage,
  onBackgroundChange,
  onBackgroundClear,
}: {
  open: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  onThemeChange: (t: "dark" | "light") => void;
  backgroundImage: string | null;
  onBackgroundChange: (dataUrl: string) => void;
  onBackgroundClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onBackgroundChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-background/60 z-50" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[280px] bg-card border-l border-border z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-border">
          <span className="font-semibold text-sm tracking-wide uppercase text-foreground">Settings</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* Theme */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onThemeChange("dark")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                onClick={() => onThemeChange("light")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
            </div>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Background</h3>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <Image className="w-4 h-4" /> Upload Image
            </button>
            {backgroundImage && (
              <button
                onClick={onBackgroundClear}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Remove Background
              </button>
            )}
            {backgroundImage && (
              <div className="rounded-xl overflow-hidden border border-border">
                <img src={backgroundImage} alt="Background preview" className="w-full h-24 object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
