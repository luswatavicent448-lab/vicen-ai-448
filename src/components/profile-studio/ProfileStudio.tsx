import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Camera,
  Image as ImageIcon,
  Wand2,
  Sun,
  Contrast,
  Sparkles,
  Loader2,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Adjustments,
  Preset,
  canvasToBlob,
  fileToDataURL,
  renderProfileImage,
} from "./cropImage";

interface Props {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  onSaved?: (url: string | null) => void;
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "none", label: "None" },
  { id: "ring", label: "Ring" },
  { id: "glow", label: "Glow" },
  { id: "soft", label: "Soft" },
];

export function ProfileStudio({ open, onClose, currentAvatarUrl, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const [adj, setAdj] = useState<Adjustments>({
    brightness: 1,
    contrast: 1,
    auto: false,
    preset: "none",
  });

  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSrc(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setAdj({ brightness: 1, contrast: 1, auto: false, preset: "none" });
    }
  }, [open]);

  // Live preview rendering (debounced via rAF)
  useEffect(() => {
    if (!src || !croppedArea || !previewCanvasRef.current) return;
    let cancelled = false;
    const id = requestAnimationFrame(async () => {
      try {
        const c = await renderProfileImage(src, croppedArea, adj, 192);
        if (cancelled) return;
        const target = previewCanvasRef.current;
        if (!target) return;
        target.width = c.width;
        target.height = c.height;
        target.getContext("2d")!.drawImage(c, 0, 0);
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [src, croppedArea, adj]);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setCroppedArea(areaPx);
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setSrc(dataUrl);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!src || !croppedArea) {
      toast.error("Choose an image first");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const canvas = await renderProfileImage(src, croppedArea, adj, 512);
      const blob = await canvasToBlob(canvas, "image/webp", 0.9);

      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (metaErr) throw metaErr;

      // Best-effort: clean up old avatar files for this user
      try {
        const { data: list } = await supabase.storage.from("avatars").list(user.id);
        const toRemove = (list ?? [])
          .map((f) => `${user.id}/${f.name}`)
          .filter((p) => p !== path);
        if (toRemove.length) await supabase.storage.from("avatars").remove(toRemove);
      } catch {
        /* non-fatal */
      }

      toast.success("Profile picture updated");
      onSaved?.(publicUrl);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Could not save image");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove your profile picture?")) return;
    setRemoving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: list } = await supabase.storage.from("avatars").list(user.id);
      const paths = (list ?? []).map((f) => `${user.id}/${f.name}`);
      if (paths.length) await supabase.storage.from("avatars").remove(paths);
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      toast.success("Profile picture removed");
      onSaved?.(null);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Could not remove image");
    } finally {
      setRemoving(false);
    }
  };

  const previewFilter = useMemo(() => {
    const b = adj.auto ? Math.max(adj.brightness, 1.05) : adj.brightness;
    const c = adj.auto ? Math.max(adj.contrast, 1.1) : adj.contrast;
    const s = adj.auto ? 1.1 : 1;
    return `brightness(${b}) contrast(${c}) saturate(${s})`;
  }, [adj]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-150">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold tracking-wide uppercase">Profile Studio</h2>
        <button
          onClick={handleSave}
          disabled={!src || saving}
          className="px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!src ? (
          // ---------- Picker ----------
          <div className="px-4 py-8 max-w-md mx-auto space-y-4">
            {currentAvatarUrl && (
              <div className="bg-card rounded-2xl p-5 flex items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <img
                  src={currentAvatarUrl}
                  alt="Current profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">Current photo</p>
                  <p className="text-xs text-muted-foreground">Choose a new one to replace it</p>
                </div>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-card rounded-2xl px-4 py-5 flex items-center gap-4 hover:bg-secondary/30 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Choose from device</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 10MB</p>
              </div>
            </button>

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-card rounded-2xl px-4 py-5 flex items-center gap-4 hover:bg-secondary/30 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Take a photo</p>
                <p className="text-xs text-muted-foreground">Use your camera</p>
              </div>
            </button>

            {currentAvatarUrl && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="w-full bg-card rounded-2xl px-4 py-4 flex items-center gap-3 text-destructive hover:bg-secondary/30 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.3)] disabled:opacity-50"
              >
                {removing ? (
                  <Loader2 className="w-[22px] h-[22px] animate-spin" />
                ) : (
                  <Trash2 className="w-[22px] h-[22px]" />
                )}
                <span className="font-medium text-sm">Remove current photo</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={onPick}
            />
          </div>
        ) : (
          // ---------- Editor ----------
          <div className="space-y-4">
            {/* Cropper */}
            <div className="relative w-full aspect-square bg-black">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  mediaStyle: { filter: previewFilter },
                  containerStyle: { background: "#000" },
                }}
              />
            </div>

            <div className="px-4 pb-8 space-y-4 max-w-md mx-auto">
              {/* Zoom */}
              <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Zoom</span>
                  <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.05}
                  onValueChange={(v) => setZoom(v[0])}
                />
              </div>

              {/* Adjustments */}
              <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4">
                <button
                  onClick={() => setAdj((a) => ({ ...a, auto: !a.auto }))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    adj.auto
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/60 text-foreground hover:bg-secondary"
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  <span className="text-sm font-medium flex-1 text-left">Auto-adjust</span>
                  <span className="text-xs">{adj.auto ? "On" : "Off"}</span>
                </button>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Sun className="w-3.5 h-3.5" /> Brightness
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((adj.brightness - 1) * 100)}
                    </span>
                  </div>
                  <Slider
                    value={[adj.brightness]}
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    onValueChange={(v) => setAdj((a) => ({ ...a, brightness: v[0] }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Contrast className="w-3.5 h-3.5" /> Contrast
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((adj.contrast - 1) * 100)}
                    </span>
                  </div>
                  <Slider
                    value={[adj.contrast]}
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    onValueChange={(v) => setAdj((a) => ({ ...a, contrast: v[0] }))}
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Style</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAdj((a) => ({ ...a, preset: p.id }))}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        adj.preset === p.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 text-foreground hover:bg-secondary"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center gap-4">
                <canvas
                  ref={previewCanvasRef}
                  className="w-20 h-20 rounded-full bg-secondary ring-2 ring-primary/30"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Live preview</p>
                  <p className="text-xs text-muted-foreground">
                    This is exactly how your photo will appear.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSrc(null)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Choose a different photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}