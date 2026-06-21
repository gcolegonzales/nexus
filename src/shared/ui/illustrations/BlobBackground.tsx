interface BlobBackgroundProps {
  className?: string;
}

export function BlobBackground({ className = "" }: BlobBackgroundProps) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <ellipse
        cx="120"
        cy="180"
        rx="180"
        ry="140"
        fill="#38A3DB"
        fillOpacity="0.08"
      />
      <ellipse
        cx="680"
        cy="120"
        rx="160"
        ry="120"
        fill="#4ECDB0"
        fillOpacity="0.1"
      />
      <ellipse
        cx="520"
        cy="420"
        rx="200"
        ry="130"
        fill="#38A3DB"
        fillOpacity="0.06"
      />
    </svg>
  );
}
