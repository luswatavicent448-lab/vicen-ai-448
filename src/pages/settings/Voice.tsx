import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Check,
  Download,
  Sparkles,
  Languages,
  Brain,
  Radio,
  Layers,
  Smartphone,
  Eye,
  Zap,
  Pause,
} from "lucide-react";
import { SettingsSubPage, SettingsGroup, SettingsRow } from "@/components/SettingsSubPage";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useVoiceSettings, VOICE_LIBRARY, VoiceId } from "@/hooks/use-voice-settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SmokeAvatar } from "@/components/voice/SmokeAvatar";

type VoiceProfile = (typeof VOICE_LIBRARY)[number];

function pickSystemVoice(hints: string[]): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const hint of hints) {
    const match = voices.find((v) =>
      v.name.toLowerCase().includes(hint.toLowerCase())
    );
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

function speakAs(profile: VoiceProfile, userRate = 1, onEnd?: () => void) {
  try {
    if (!("speechSynthesis" in window)) {
      toast.message("Voice preview not supported on this device");
      return;
    }
    // 50ms fade-out: cancel previous immediately
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(profile.sample);
    const sysVoice = pickSystemVoice(profile.voiceHints);
    if (sysVoice) u.voice = sysVoice;
    u.pitch = profile.pitch;
    u.rate = profile.rate * userRate;
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    window.speechSynthesis.speak(u);
  } catch {
    toast.error("Could not play preview");
  }
}

function speakPlain(text: string, rate = 1) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch { /* noop */ }
}

export default function VoicePage() {
  const { voice, update } = useVoiceSettings();
  const [downloaded, setDownloaded] = useState<Record<string, "idle" | "downloading" | "done">>({});
  const [previewing, setPreviewing] = useState<VoiceId | null>(null);
  const previewTimer = useRef<number | null>(null);

  // Warm up voices list (Chrome loads asynchronously)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const handlePreview = (profile: VoiceProfile) => {
    if (previewing === profile.id) {
      window.speechSynthesis?.cancel();
      setPreviewing(null);
      return;
    }
    setPreviewing(profile.id);
    speakAs(profile, voice.speed, () => setPreviewing((cur) => (cur === profile.id ? null : cur)));
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setPreviewing(null), 6000);
  };

  const handleSelect = (profile: VoiceProfile) => {
    if (voice.selectedVoice === profile.id) return;
    update("selectedVoice", profile.id);
    // light haptic on supported devices
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.(10); } catch { /* noop */ }
    }
    toast.success(`Voice set to ${profile.name}`);
  };

  const handleDownload = (id: VoiceId) => {
    setDownloaded((d) => ({ ...d, [id]: "downloading" }));
    setTimeout(() => {
      setDownloaded((d) => ({ ...d, [id]: "done" }));
      toast.success("Voice downloaded for offline use");
    }, 1200);
  };

  const speedPreset = (v: number) => {
    update("speed", v);
    toast.message(`Speed set to ${v}x`);
  };

  const selectedProfile =
    VOICE_LIBRARY.find((v) => v.id === voice.selectedVoice) ?? VOICE_LIBRARY[0];
  const otherVoices = VOICE_LIBRARY.filter((v) => v.id !== selectedProfile.id);

  return (
    <SettingsSubPage title="Voice">
      {/* 1. VOICE STUDIO */}
      <SettingsGroup label="🎙️ Voice Studio">
        <div className="p-4 space-y-4">
          {/* HERO — Currently selected */}
          <div
            className="relative rounded-2xl p-5 overflow-hidden transition-all duration-200"
            style={{
              background: "#1C1C24",
              border: `2px solid ${selectedProfile.accent}`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 18px 40px -20px ${selectedProfile.accent}66, inset 0 0 60px -20px ${selectedProfile.accent}33`,
            }}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              Currently selected
            </p>
            <div className="flex items-center gap-4">
              <SmokeAvatar
                colorA={selectedProfile.colorA}
                colorB={selectedProfile.colorB}
                size={84}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {selectedProfile.name}
                  </h3>
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: selectedProfile.accent }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mb-3 truncate">
                  {selectedProfile.tagline}
                </p>
                <button
                  onClick={() => handlePreview(selectedProfile)}
                  className="rounded-xl px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {previewing === selectedProfile.id ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {previewing === selectedProfile.id ? "Stop" : "Preview voice"}
                </button>
              </div>
            </div>
          </div>

          {/* GRID — Other voices */}
          <div className="grid grid-cols-2 gap-4">
            {otherVoices.map((v) => {
              const dl = downloaded[v.id] ?? "idle";
              const isPreviewing = previewing === v.id;
              return (
                <div
                  key={v.id}
                  className="relative rounded-2xl p-5 overflow-hidden transition-all duration-200 flex flex-col items-center text-center"
                  style={{
                    background: "#1C1C24",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <SmokeAvatar colorA={v.colorA} colorB={v.colorB} size={84} />
                  <p className="mt-3 text-[15px] font-semibold text-foreground leading-tight">
                    {v.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 mb-3 line-clamp-1">
                    {v.tagline}
                  </p>
                  <div className="w-full flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(v)}
                      aria-label={`Preview ${v.name}`}
                      className="flex-1 rounded-xl py-2 text-[11px] font-medium flex items-center justify-center gap-1 transition-all active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      {isPreviewing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {isPreviewing ? "Stop" : "Preview"}
                    </button>
                    <button
                      onClick={() => handleSelect(v)}
                      className="flex-1 rounded-xl py-2 text-[11px] font-semibold transition-all active:scale-95"
                      style={{
                        background: v.accent,
                        color: "#0A0A0A",
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <button
                    onClick={() => dl === "idle" && handleDownload(v.id)}
                    className="mt-2 text-[10.5px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                  >
                    {dl === "done" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" /> Offline ready
                      </>
                    ) : dl === "downloading" ? (
                      "Downloading…"
                    ) : (
                      <>
                        <Download className="w-3 h-3" /> Download for offline
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-foreground">Warmth</span>
                <span className="text-[11px] text-muted-foreground">
                  {voice.warmth < 33 ? "Cold" : voice.warmth > 66 ? "Warm" : "Neutral"}
                </span>
              </div>
              <Slider
                value={[voice.warmth]}
                onValueChange={([v]) => update("warmth", v)}
                max={100}
                step={1}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-foreground">Energy</span>
                <span className="text-[11px] text-muted-foreground">
                  {voice.energy < 33 ? "Calm" : voice.energy > 66 ? "Energetic" : "Balanced"}
                </span>
              </div>
              <Slider
                value={[voice.energy]}
                onValueChange={([v]) => update("energy", v)}
                max={100}
                step={1}
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* 2. VOICE OUTPUT */}
      <SettingsGroup label="🔊 Voice Output">
        <SettingsRow
          icon={voice.voiceOutput ? Volume2 : VolumeX}
          title="Voice output"
          description={voice.voiceOutput ? "Vicen speaks responses" : "Text only"}
          right={
            <Switch
              checked={voice.voiceOutput}
              onCheckedChange={(v) => update("voiceOutput", v)}
            />
          }
        />
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Speed</span>
            <span className="text-xs text-muted-foreground">{voice.speed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[voice.speed]}
            onValueChange={([v]) => update("speed", v)}
            min={0.5}
            max={2}
            step={0.1}
          />
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Slow", v: 0.75 },
              { label: "Normal", v: 1.0 },
              { label: "Fast", v: 1.5 },
              { label: "Very Fast", v: 2.0 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => speedPreset(p.v)}
                className={cn(
                  "rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                  Math.abs(voice.speed - p.v) < 0.05
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => speakPlain("This is how I sound at this speed.", voice.speed)}
            className="w-full bg-secondary hover:bg-secondary/70 rounded-xl py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
      </SettingsGroup>

      {/* 3. DICTATION */}
      <SettingsGroup label="🎤 Dictation">
        <SettingsRow
          icon={Languages}
          title="Language"
          right={
            <select
              value={voice.dictationLanguage}
              onChange={(e) => update("dictationLanguage", e.target.value as never)}
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="sw">Kiswahili</option>
              <option value="es">Spanish</option>
              <option value="ar">Arabic</option>
            </select>
          }
        />
        <SettingsRow
          title="Punctuation"
          description={voice.punctuationMode === "auto" ? "Added automatically" : "Say 'comma', 'full stop'"}
          right={
            <select
              value={voice.punctuationMode}
              onChange={(e) => update("punctuationMode", e.target.value as never)}
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          }
        />
        <SettingsRow
          title="Noise suppression"
          description="Filter background sound"
          right={<Switch checked={voice.noiseSuppression} onCheckedChange={(v) => update("noiseSuppression", v)} />}
        />
        <SettingsRow
          title="Silence detection"
          description="Stop after ~2 sec of silence"
          right={<Switch checked={voice.silenceStop} onCheckedChange={(v) => update("silenceStop", v)} />}
        />
        <SettingsRow
          icon={Mic}
          title="Long-press shortcut"
          description="Long-press chat bar to dictate"
          right={<Switch checked={voice.longPressDictation} onCheckedChange={(v) => update("longPressDictation", v)} />}
        />
      </SettingsGroup>

      {/* 4. INTELLIGENCE */}
      <SettingsGroup label="🧠 Intelligence">
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Controls how deeply Vicen reasons during voice interactions.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "basic", label: "Basic", desc: "Fast, simple" },
                { id: "balanced", label: "Balanced", desc: "Good mix" },
                { id: "advanced", label: "Advanced", desc: "Deep" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => update("intelligence", opt.id)}
                className={cn(
                  "rounded-xl p-3 text-left border transition-all",
                  voice.intelligence === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border/40 bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      {/* 5. INPUT LANGUAGE */}
      <SettingsGroup label="🌐 Input Language">
        <SettingsRow
          title="Auto-detect"
          description="Recognize language automatically"
          right={<Switch checked={voice.autoDetectInput} onCheckedChange={(v) => update("autoDetectInput", v)} />}
        />
        {!voice.autoDetectInput && (
          <SettingsRow
            title="Manual selection"
            right={
              <select
                value={voice.inputLanguage}
                onChange={(e) => update("inputLanguage", e.target.value as never)}
                className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="sw">Kiswahili</option>
                <option value="es">Spanish</option>
                <option value="ar">Arabic</option>
              </select>
            }
          />
        )}
      </SettingsGroup>

      {/* 6. LIVE MODE BEHAVIOR */}
      <SettingsGroup label="⚡ Live Mode Behavior">
        <SettingsRow
          icon={Radio}
          title="Continuous listening"
          description="No need to tap mic again"
          right={<Switch checked={voice.continuousListening} onCheckedChange={(v) => update("continuousListening", v)} />}
        />
        <SettingsRow
          icon={Zap}
          title="Interrupt AI"
          description="Speaking stops Vicen instantly"
          right={<Switch checked={voice.interruptAI} onCheckedChange={(v) => update("interruptAI", v)} />}
        />
        <SettingsRow
          icon={Eye}
          title="Voice + Vision sync"
          description="Respond to camera & voice together"
          right={<Switch checked={voice.voiceVisionSync} onCheckedChange={(v) => update("voiceVisionSync", v)} />}
        />
        <SettingsRow
          icon={Sparkles}
          title="Streaming voice"
          description="Speak while generating in real-time"
          right={<Switch checked={voice.streamingVoice} onCheckedChange={(v) => update("streamingVoice", v)} />}
        />
      </SettingsGroup>

      {/* 7. ADDITIONAL CONTROLS */}
      <SettingsGroup label="⚙️ Additional Controls">
        <SettingsRow
          icon={Layers}
          title="Background conversations"
          description="Keep working when app is minimized"
          right={<Switch checked={voice.backgroundConversations} onCheckedChange={(v) => update("backgroundConversations", v)} />}
        />
        <SettingsRow
          icon={Smartphone}
          title="Open in separate mode"
          description="Voice UI as floating overlay"
          right={<Switch checked={voice.separateMode} onCheckedChange={(v) => update("separateMode", v)} />}
        />
        <SettingsRow
          icon={Mic}
          title="Default assistant"
          description="Set Vicen as your system assistant"
          right={<Switch checked={voice.defaultAssistant} onCheckedChange={(v) => update("defaultAssistant", v)} />}
        />
      </SettingsGroup>
    </SettingsSubPage>
  );
}