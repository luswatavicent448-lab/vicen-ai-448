import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Users, StickyNote, BookOpen, Brain, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Item = { label: string; icon: typeof Camera; onClick: () => void };

export function PlusMenu({ onImage }: { onImage?: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const items: Item[] = [
    { label: "Camera", icon: Camera, onClick: () => { setOpen(false); cameraRef.current?.click(); } },
    { label: "Upload Image", icon: ImagePlus, onClick: () => { setOpen(false); galleryRef.current?.click(); } },
    { label: "Group Chat", icon: Users, onClick: () => go("/group-chat") },
    { label: "Notes", icon: StickyNote, onClick: () => go("/notes") },
    { label: "Past Papers", icon: BookOpen, onClick: () => go("/past-papers") },
    { label: "Quiz", icon: Brain, onClick: () => go("/quiz") },
  ];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && onImage) onImage(f);
    e.target.value = "";
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open quick actions"
        aria-expanded={open}
        className={cn(
          "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all border",
          open
            ? "bg-[#3B82F6]/15 border-[#3B82F6]/50 text-[#3B82F6]"
            : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
        )}
      >
        <Plus className="w-[22px] h-[22px]" strokeWidth={2} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-3 w-60 rounded-2xl border border-white/10 bg-black shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9)] py-1.5 origin-bottom-left animate-in fade-in-0 zoom-in-95 duration-150 z-50"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={it.onClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] text-white/90 hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <it.icon className="w-[18px] h-[18px] text-[#3B82F6]" />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}