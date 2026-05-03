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
  // Two color stops + accent for the animated "smoke" avatar
  colorA: string;
  colorB: string;
  accent: string; // hex used for selected glow / border
  // Voice synthesis hints
  pitch: number; // 0 - 2
  rate: number; // 0.5 - 2
  voiceHints: string[]; // substrings to match preferred system voices
}[] = [
  {
    id: "juniper", name: "Juniper", tagline: "Open & Upbeat",
    sample: "Hey! Ready to build something amazing today?",
    colorA: "#3B82F6", colorB: "#FFFFFF", accent: "#3B82F6",
    pitch: 1.15, rate: 1.05, voiceHints: ["Samantha", "Jenny", "Aria", "Female"],
  },
  {
    id: "nova", name: "Nova", tagline: "Bright & Energetic",
    sample: "Let's go — I've got fresh ideas firing already!",
    colorA: "#F97316", colorB: "#FFFFFF", accent: "#F97316",
    pitch: 1.3, rate: 1.15, voiceHints: ["Karen", "Zira", "Tessa", "Female"],
  },
  {
    id: "atlas", name: "Atlas", tagline: "Deep & Commanding",
    sample: "Let's proceed step by step. I've got this.",
    colorA: "#10B981", colorB: "#FFFFFF", accent: "#10B981",
    pitch: 0.7, rate: 0.95, voiceHints: ["Daniel", "Alex", "David", "Male"],
  },
  {
    id: "luna", name: "Luna", tagline: "Calm & Gentle",
    sample: "Take a breath… we'll handle this calmly.",
    colorA: "#EF4444", colorB: "#FFFFFF", accent: "#EF4444",
    pitch: 0.95, rate: 0.85, voiceHints: ["Moira", "Fiona", "Susan", "Female"],
  },
  {
    id: "orion", name: "Orion", tagline: "Smooth & Intelligent",
    sample: "Let's reason through this together, carefully.",
    colorA: "#FB923C", colorB: "#FFFFFF", accent: "#FB923C",
    pitch: 0.85, rate: 1.0, voiceHints: ["Oliver", "Ryan", "Mark", "Male"],
  },
  {
    id: "stem", name: "Stem", tagline: "Lively & Expressive",
    sample: "Ooh, this is going to be fun — let's dive right in!",
    colorA: "#22C55E", colorB: "#FFFFFF", accent: "#22C55E",
    pitch: 1.25, rate: 1.1, voiceHints: ["Tessa", "Catherine", "Female"],
  },
  {
    id: "iris", name: "Iris", tagline: "Relaxed & Friendly",
    sample: "Hey there, what are we working on today?",
    colorA: "#EC4899", colorB: "#FFFFFF", accent: "#EC4899",
    pitch: 1.1, rate: 0.98, voiceHints: ["Allison", "Victoria", "Female"],
  },
  {
    id: "vega", name: "Vega", tagline: "Sharp & Futuristic",
    sample: "Processing… optimized response ready.",
    colorA: "#38BDF8", colorB: "#FFFFFF", accent: "#38BDF8",
    pitch: 0.6, rate: 1.05, voiceHints: ["Fred", "Microsoft David", "Male"],
  },
  {
    id: "lilith", name: "Lilith", tagline: "Warm & Casual",
    sample: "Hey you — glad you're here. Let's chat.",
    colorA: "#A16207", colorB: "#FFFFFF", accent: "#A16207",
    pitch: 0.9, rate: 0.92, voiceHints: ["Veena", "Karen", "Female"],
  },
  {
    id: "aria", name: "Aria", tagline: "Soft & Elegant",
    sample: "How may I help you today?",
    colorA: "#FACC15", colorB: "#FFFFFF", accent: "#FACC15",
    pitch: 1.05, rate: 0.95, voiceHints: ["Ava", "Serena", "Aria", "Female"],
  },
];