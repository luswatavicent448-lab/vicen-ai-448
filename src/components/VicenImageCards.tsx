import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { VicenImage } from "@/types/chat";

export function VicenImageCards({ images }: { images: VicenImage[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const next = useCallback(() => setOpenIdx((i) => (i === null ? 0 : (i + 1) % images.length)), [images.length]);
  const prev = useCallback(() => setOpenIdx((i) => (i === null ? 0 : (i - 1 + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, next, prev]);

  if (!images || images.length === 0) return null;
  const active = openIdx !== null ? images[openIdx] : null;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setOpenIdx(i)}
            className="group flex flex-col gap-1.5 text-left rounded-xl overflow-hidden bg-card/40 border border-border/50 backdrop-blur-sm hover:scale-[1.02] hover:border-primary/40 transition-all duration-200 shadow-sm"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-secondary/30">
              <img
                src={img.thumbnail_url || img.url}
                alt={img.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-background/80 text-[10px] font-semibold backdrop-blur-sm">
                Image {i + 1}
              </div>
            </div>
            <div className="px-2 pb-2">
              <p className="text-xs font-medium text-foreground line-clamp-1">{img.title}</p>
              {img.category && (
                <span className="inline-block mt-0.5 text-[10px] text-muted-foreground">
                  [{img.category}]
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md animate-fade-in p-4"
          onClick={close}
        >
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card/80 hover:bg-card border border-border flex items-center justify-center text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 hover:bg-card border border-border flex items-center justify-center"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 hover:bg-card border border-border flex items-center justify-center"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className="max-w-3xl w-full max-h-[90vh] flex flex-col gap-4 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.url}
              alt={active.title}
              className="max-w-full max-h-[70vh] object-contain rounded-xl"
            />
            <div className="text-center px-4">
              <h3 className="font-semibold text-foreground">{active.title}</h3>
              {active.category && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Category: {active.category}{active.sub_category ? ` · ${active.sub_category}` : ""}
                </p>
              )}
              {active.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-prose">{active.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}