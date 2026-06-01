import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  attachment: string;
  durationMs?: number | null;
  mine: boolean;
};

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * Resolves a voice attachment into a playable URL.
 * - If `attachment` is already an http(s) URL (legacy public bucket data), use as-is.
 * - Otherwise treat as a storage path inside the private `voice-messages` bucket
 *   and create a short-lived signed URL.
 */
export function VoiceMessage({ attachment, durationMs, mine }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!attachment) return;
    if (/^https?:\/\//.test(attachment)) {
      setSrc(attachment);
      return;
    }
    (async () => {
      const { data, error } = await supabase.storage
        .from("voice-messages")
        .createSignedUrl(attachment, 60 * 60);
      if (!cancelled && data?.signedUrl && !error) setSrc(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachment]);

  return (
    <div className="flex flex-col gap-1 min-w-[200px]">
      {src ? (
        <audio controls src={src} className="w-full h-9" preload="metadata" />
      ) : (
        <div className="h-9 rounded bg-foreground/5 animate-pulse" />
      )}
      {durationMs ? (
        <span
          className={`text-[10px] ${
            mine ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatDuration(durationMs)}
        </span>
      ) : null}
    </div>
  );
}