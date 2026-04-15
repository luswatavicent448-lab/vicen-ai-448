import { useState } from "react";
import { Sparkles } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function LoginScreen({
  onGuest,
  onSignedIn,
}: {
  onGuest: () => void;
  onSignedIn: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      if (result.redirected) {
        return; // browser will redirect
      }

      // Session set successfully
      onSignedIn();
    } catch {
      toast.error("Sign in failed. Please try again.");
      setLoading(false);
    }
  };

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
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
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
