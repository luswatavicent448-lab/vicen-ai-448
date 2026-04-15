export type ChatSettings = {
  // Personalization
  userName: string;
  language: "english" | "french";
  tone: "friendly" | "formal" | "funny";

  // AI Behavior
  responseLength: "short" | "medium" | "detailed";
  followUpQuestions: boolean;

  // Privacy
  chatHistory: boolean;
  contentFilter: "strict" | "moderate" | "off";

  // Learning Mode
  subject: "math" | "biology" | "ict" | "general";
  stepByStep: boolean;

  // Appearance
  theme: "dark" | "light";
  fontSize: "small" | "medium" | "large";

  // Advanced
  memory: boolean;
};

export const defaultSettings: ChatSettings = {
  userName: "",
  language: "english",
  tone: "friendly",
  responseLength: "medium",
  followUpQuestions: false,
  chatHistory: true,
  contentFilter: "strict",
  subject: "general",
  stepByStep: true,
  theme: "dark",
  fontSize: "medium",
  memory: true,
};
