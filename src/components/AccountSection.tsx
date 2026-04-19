import { useEffect, useState } from "react";
import { UserCircle2, LogIn, LogOut, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function AccountSection() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Set up listener FIRST, then check existing session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in!");
      localStorage.setItem("vicen-user-mode", "signed-in");
      setLoading(false);
    } catch {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !password) {
      toast.error("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        if (data.session) {
          toast.success("Account created!");
          localStorage.setItem("vicen-user-mode", "signed-in");
          setShowEmailForm(false);
        } else {
          toast.success("Account created. You can sign in now.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailInput.trim(),
          password,
        });
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        toast.success("Welcome back!");
        localStorage.setItem("vicen-user-mode", "signed-in");
        setShowEmailForm(false);
      }
      setEmailInput("");
      setPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out failed");
    } else {
      // Keep the user in the app — switch to guest mode rather than locking them out
      localStorage.setItem("vicen-user-mode", "guest");
      toast.success("Signed out — guest mode active");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 py-1">
        <UserCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
        <p className="text-sm text-foreground truncate">
          {email ? (
            <>
              <span className="text-muted-foreground">Signed in as </span>
              <span className="font-medium">{email}</span>
            </>
          ) : (
            <>
              <span className="font-medium">Guest mode</span>
              <span className="text-muted-foreground"> — sign in anytime</span>
            </>
          )}
        </p>
      </div>

      {email ? (
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sign out
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign in with Google
          </button>
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              Sign in with Email
            </button>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-2 pt-1">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  disabled={loading}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailInput("");
                    setPassword("");
                  }}
                  disabled={loading}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
