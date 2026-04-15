import { useState, useEffect, useCallback } from "react";
import { ChatSettings, defaultSettings } from "@/types/settings";

const STORAGE_KEY = "vicen-settings";

function load(): ChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<ChatSettings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback(<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettingsState(defaultSettings);
  }, []);

  return { settings, update, reset };
}
