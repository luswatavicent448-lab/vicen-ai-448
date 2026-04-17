import { useState } from "react";
import { Sparkles, Mail, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "choose" | "email-signin" | "email-signup";

export function LoginScreen({
  onGuest,
  onSignedIn,
}: {
  onGuest: () => void;
  onSignedIn: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        console.error("Google sign in error:", result.error);
        toast.error("Google sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      if (result.redirected) {
        // browser is navigating away to Google — keep loading state
        return;
      }

      // Tokens received and session set
      onSignedIn();
    } catch (err) {
      console.error("Google sign in exception:", err);
      toast.error("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (mode === "email-signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          console.error("Sign up error:", error);
          toast.error(error.message || "Sign up failed");
          setLoading(false);
          return;
        }
        if (data.session) {
          toast.success("Account created!");
          onSignedIn();
        } else {
          toast.success("Account created! You can sign in now.");
          setMode("email-signin");
          setLoading(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          console.error("Sign in error:", error);
          toast.error(error.message || "Invalid email or password");
          setLoading(false);
          return;
        }
        toast.success("Welcome back!");
        onSignedIn();
      }
    } catch (err) {
      console.error("Email auth exception:", err);
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center px-4 animate-fade-up">
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-[360px] text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome to Vicen AI</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "email-signup" ? "Create your account" : mode === "email-signin" ? "Sign in to continue" : "Start chatting with AI"}
          </p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
            <button
              onClick={() => setMode("email-signin")}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mail className="w-4 h-4" /> Continue with Email
            </button>
            <button
              onClick={onGuest}
              disabled={loading}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Stay logged out
            </button>
          </div>
        )}

        {(mode === "email-signin" || mode === "email-signup") && (
          <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              autoComplete={mode === "email-signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? "Please wait..."
                : mode === "email-signup"
                ? "Create account"
                : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "email-signin" ? "email-signup" : "email-signin")}
              disabled={loading}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "email-signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              disabled={loading}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
