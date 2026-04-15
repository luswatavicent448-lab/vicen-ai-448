import { ImageIcon, FileText, Lightbulb, Brain, Calendar } from "lucide-react";

const actions = [
  { label: "Today's date", icon: Calendar, prompt: "What is today's date?" },
  { label: "Create image", icon: ImageIcon, prompt: "Create an image for me" },
  { label: "Summarize text", icon: FileText, prompt: "Summarize the following text:" },
  { label: "Get advice", icon: Lightbulb, prompt: "Give me advice about" },
  { label: "Brainstorm", icon: Brain, prompt: "Help me brainstorm ideas for" },
];

export function QuickActions({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => onSelect(a.prompt)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 border border-border transition-colors"
        >
          <a.icon className="w-4 h-4" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
