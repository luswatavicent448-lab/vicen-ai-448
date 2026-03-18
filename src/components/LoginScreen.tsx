import { Sparkles } from "lucide-react";

export function LoginScreen({
  onGuest,
  onSignIn,
}: {
  onGuest: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center animate-fade-up">
      <div className="bg-card border border-border rounded-2xl p-8 w-[320px] text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome to Vicen AI</h2>
          <p className="text-sm text-muted-foreground mt-1">Start chatting with AI</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={onSignIn}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all"
          >
            Sign in
          </button>
          <p className="text-xs text-muted-foreground">Already have an account</p>
          <button
            onClick={onGuest}
            className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
          >
            Stay logged out
          </button>
        </div>
      </div>
    </div>
  );
}
