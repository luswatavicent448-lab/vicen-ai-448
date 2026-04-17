import { ImageIcon, FileText, Lightbulb, Brain, Calendar, StickyNote, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const chatActions = [
  { label: "Today's date", icon: Calendar, prompt: "What is today's date?" },
  { label: "Summarize text", icon: FileText, prompt: "Summarize the following text:" },
  { label: "Get advice", icon: Lightbulb, prompt: "Give me advice about" },
  { label: "Brainstorm", icon: ImageIcon, prompt: "Help me brainstorm ideas for" },
];

const navActions = [
  { label: "Notes", icon: StickyNote, path: "/notes" },
  { label: "Past Papers", icon: BookOpen, path: "/past-papers" },
  { label: "Quiz", icon: Brain, path: "/quiz" },
  { label: "Group Chat", icon: Users, path: "/group-chat" },
];

export function QuickActions({ onSelect }: { onSelect: (prompt: string) => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {chatActions.map((a) => (
        <button
          key={a.label}
          onClick={() => onSelect(a.prompt)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 border border-border transition-colors"
        >
          <a.icon className="w-4 h-4" />
          {a.label}
        </button>
      ))}
      {navActions.map((a) => (
        <button
          key={a.label}
          onClick={() => navigate(a.path)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 border border-primary/20 transition-colors"
        >
          <a.icon className="w-4 h-4" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
