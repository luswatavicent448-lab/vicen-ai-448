import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const TEACHER_PASSWORD = "xuesheng2311";

export function TeacherApprovalDialog({
  pendingContent,
  onApprove,
  onReject,
}: {
  pendingContent: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleApprove = () => {
    if (password === TEACHER_PASSWORD) {
      onApprove();
      setPassword("");
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-up">
      <div className="bg-card border border-border rounded-2xl p-6 w-[340px] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Teacher Approval Required</h3>
            <p className="text-xs text-muted-foreground">A response is waiting for approval</p>
          </div>
        </div>

        <div className="bg-secondary rounded-xl p-3 max-h-32 overflow-y-auto scrollbar-thin">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {pendingContent.slice(0, 300)}{pendingContent.length > 300 ? "..." : ""}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleApprove()}
            placeholder="Enter teacher password"
            className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {error && <p className="text-xs text-destructive">Incorrect password</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium text-sm hover:bg-destructive/20 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
