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

function speakSample(text: string, rate = 1) {
  try {
    if (!("speechSynthesis" in window)) {
      toast.message("Voice preview not supported on this device");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch {
    toast.error("Could not play preview");
  }
}

export default function VoicePage() {
  const { voice, update } = useVoiceSettings();
  const [downloaded, setDownloaded] = useState<Record<string, "idle" | "downloading" | "done">>({});
  const [previewing, setPreviewing] = useState<VoiceId | null>(null);
  const previewTimer = useRef<number | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const handlePreview = (id: VoiceId, sample: string) => {
    setPreviewing(id);
    speakSample(sample, voice.speed);
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setPreviewing(null), 4000);
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

  return (
    <SettingsSubPage title="Voice">
      {/* 1. VOICE STUDIO */}
      <SettingsGroup label="🎙️ Voice Studio">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Currently selected</p>
              <p className="text-foreground font-semibold flex items-center gap-2">
                {VOICE_LIBRARY.find((v) => v.id === voice.selectedVoice)?.name}
                <Check className="w-4 h-4 text-primary" />
              </p>
            </div>
            <button
              onClick={() => {
                const v = VOICE_LIBRARY.find((x) => x.id === voice.selectedVoice);
                if (v) handlePreview(v.id, v.sample);
              }}
              className="bg-secondary hover:bg-secondary/70 text-foreground rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {VOICE_LIBRARY.map((v) => {
              const selected = voice.selectedVoice === v.id;
              const dl = downloaded[v.id] ?? "idle";
              return (
                <div
                  key={v.id}
                  className={cn(
                    "relative rounded-2xl p-3 border transition-all overflow-hidden",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border/40 bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full bg-gradient-to-br mb-2",
                      v.gradient
                    )}
                  />
                  <p className="text-sm font-semibold text-foreground leading-tight">{v.name}</p>
                  <p className="text-[11px] text-muted-foreground mb-2.5">{v.tagline}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePreview(v.id, v.sample)}
                      className="flex-1 bg-background/60 hover:bg-background text-foreground rounded-lg py-1.5 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                      aria-label={`Preview ${v.name}`}
                    >
                      {previewing === v.id ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        update("selectedVoice", v.id);
                        toast.success(`${v.name} set as default`);
                      }}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/60 hover:bg-background text-foreground"
                      )}
                    >
                      {selected ? "Default" : "Set"}
                    </button>
                  </div>
                  <button
                    onClick={() => dl === "idle" && handleDownload(v.id)}
                    className="mt-1.5 w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1"
                  >
                    {dl === "done" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" /> Downloaded
                      </>
                    ) : dl === "downloading" ? (
                      "Downloading…"
                    ) : (
                      <>
                        <Download className="w-3 h-3" /> Offline
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
            onClick={() => speakSample("This is how I sound at this speed.", voice.speed)}
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