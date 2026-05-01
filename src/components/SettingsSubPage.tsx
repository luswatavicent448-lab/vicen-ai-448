import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SettingsSubPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">{children}</div>
    </div>
  );
}

export function SettingsGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {label && <h3 className="text-sm text-muted-foreground px-1">{label}</h3>}
      <div className="bg-card rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)] divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}

export function SettingsRow({
  icon: Icon,
  title,
  description,
  right,
  onClick,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <div className="w-full flex items-center gap-4 px-4 py-3.5 text-left">
      {Icon && <Icon className="w-[22px] h-[22px] text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="w-full hover:bg-secondary/40 transition-colors">
        {content}
      </button>
    );
  }
  return content;
}