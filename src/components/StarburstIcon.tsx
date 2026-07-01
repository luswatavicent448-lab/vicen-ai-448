export function StarburstIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  const rays = 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {Array.from({ length: rays }).map((_, i) => {
        const angle = (i * 360) / rays;
        return (
          <line
            key={i}
            x1="24"
            y1="7"
            x2="24"
            y2="17"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 24 24)`}
          />
        );
      })}
    </svg>
  );
}