import { useState, useEffect, useCallback } from "react";

export type VoiceId =
  | "juniper"
  | "nova"
  | "atlas"
  | "luna"
  | "orion"
  | "stem"
  | "iris"
  | "vega"
  | "lilith"
  | "aria";

export type VoiceSettings = {
  selectedVoice: VoiceId;
  warmth: number; // 0-100
  energy: number; // 0-100
  voiceOutput: boolean;
  speed: number; // 0.5 - 2.0
  dictationLanguage: "auto" | "en" | "fr" | "sw" | "es" | "ar";
  punctuationMode: "auto" | "manual";
  noiseSuppression: boolean;
  silenceStop: boolean;
  longPressDictation: boolean;
  intelligence: "basic" | "balanced" | "advanced";
  autoDetectInput: boolean;
  inputLanguage: "en" | "fr" | "sw" | "es" | "ar";
  continuousListening: boolean;
  interruptAI: boolean;
  voiceVisionSync: boolean;
  streamingVoice: boolean;
  backgroundConversations: boolean;
  separateMode: boolean;
  defaultAssistant: boolean;
};

export const defaultVoiceSettings: VoiceSettings = {
  selectedVoice: "juniper",
  warmth: 60,
  energy: 55,
  voiceOutput: true,
  speed: 1.0,
  dictationLanguage: "auto",
  punctuationMode: "auto",
  noiseSuppression: true,
  silenceStop: true,
  longPressDictation: true,
  intelligence: "balanced",
  autoDetectInput: true,
  inputLanguage: "en",
  continuousListening: false,
  interruptAI: true,
  voiceVisionSync: false,
  streamingVoice: true,
  backgroundConversations: false,
  separateMode: false,
  defaultAssistant: false,
};

const KEY = "vicen-voice-settings";

function load(): VoiceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultVoiceSettings;
    return { ...defaultVoiceSettings, ...JSON.parse(raw) };
  } catch {
    return defaultVoiceSettings;
  }
}

export function useVoiceSettings() {
  const [voice, setVoice] = useState<VoiceSettings>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(voice));
  }, [voice]);

  const update = useCallback(
    <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
      setVoice((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return { voice, update };
}

export const VOICE_LIBRARY: {
  id: VoiceId;
  name: string;
  tagline: string;
  sample: string;
  gradient: string;
}[] = [
  { id: "juniper", name: "Juniper", tagline: "Open & Upbeat", sample: "Hey! Ready to make something awesome today?", gradient: "from-emerald-400 to-teal-500" },
  { id: "nova", name: "Nova", tagline: "Bright & Energetic", sample: "Let's go — I'm bursting with ideas!", gradient: "from-amber-400 to-orange-500" },
  { id: "atlas", name: "Atlas", tagline: "Deep & Confident", sample: "Steady, focused, and ready when you are.", gradient: "from-slate-500 to-zinc-700" },
  { id: "luna", name: "Luna", tagline: "Calm & Soothing", sample: "Take a breath. I'm right here with you.", gradient: "from-indigo-400 to-violet-500" },
  { id: "orion", name: "Orion", tagline: "Smooth & Intelligent", sample: "Let's reason through this together, step by step.", gradient: "from-sky-500 to-blue-600" },
  { id: "stem", name: "Stem", tagline: "Lively & Expressive", sample: "Ooh, this is going to be fun — let's dive in!", gradient: "from-pink-400 to-rose-500" },
  { id: "iris", name: "Iris", tagline: "Relaxed & Friendly", sample: "Hey there, what are we working on today?", gradient: "from-lime-400 to-green-500" },
  { id: "vega", name: "Vega", tagline: "Futuristic", sample: "Systems online. Ready to assist.", gradient: "from-cyan-400 to-fuchsia-500" },
  { id: "lilith", name: "Lilith", tagline: "Warm & Casual", sample: "Hey you — glad you're here.", gradient: "from-rose-400 to-red-500" },
  { id: "aria", name: "Aria", tagline: "Soft & Elegant", sample: "How may I help you today?", gradient: "from-purple-400 to-pink-400" },
];