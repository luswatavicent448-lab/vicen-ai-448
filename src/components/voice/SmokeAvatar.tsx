import { CSSProperties } from "react";

/**
 * Animated "smoke in air" avatar — three blurred conic blobs rotating
 * at different speeds, masked into a circle.
 */
export function SmokeAvatar({
  colorA,
  colorB,
  size = 120,
  className = "",
}: {
  colorA: string;
  colorB: string;
  size?: number;
  className?: string;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
  };
  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
      style={{
        ...style,
        background: `radial-gradient(circle at 30% 30%, ${colorA}, ${colorB} 70%, ${colorA}33)`,
        boxShadow: `0 8px 24px -8px ${colorA}66`,
      }}
      aria-hidden
    >
      <span
        className="absolute inset-[-25%] rounded-full opacity-80 animate-[spin_9s_linear_infinite]"
        style={{
          background: `conic-gradient(from 0deg, ${colorA}, transparent 40%, ${colorB}, transparent 75%, ${colorA})`,
          filter: "blur(20px)",
        }}
      />
      <span
        className="absolute inset-[-30%] rounded-full opacity-70 animate-[spin_14s_linear_infinite_reverse]"
        style={{
          background: `conic-gradient(from 180deg, ${colorB}, transparent 50%, ${colorA}, transparent 80%, ${colorB})`,
          filter: "blur(24px)",
        }}
      />
      <span
        className="absolute inset-[-20%] rounded-full opacity-60 animate-[spin_18s_linear_infinite]"
        style={{
          background: `radial-gradient(circle at 70% 30%, ${colorA}cc, transparent 55%), radial-gradient(circle at 30% 70%, ${colorB}aa, transparent 60%)`,
          filter: "blur(18px)",
        }}
      />
      {/* subtle inner ring */}
      <span
        className="absolute inset-1 rounded-full"
        style={{ boxShadow: "inset 0 0 18px rgba(255,255,255,0.18), inset 0 0 1px rgba(255,255,255,0.3)" }}
      />
    </div>
  );
}