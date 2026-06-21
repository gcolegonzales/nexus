"use client";

interface RoomFootprintPreviewProps {
  widthMm: number;
  lengthMm: number;
  label?: string;
}

export function RoomFootprintPreview({
  widthMm,
  lengthMm,
  label,
}: RoomFootprintPreviewProps) {
  const aspect = widthMm / Math.max(lengthMm, 1);
  const boxWidth = aspect >= 1 ? 100 : 100 * aspect;
  const boxHeight = aspect >= 1 ? 100 / aspect : 100;
  const offsetX = (120 - boxWidth) / 2;
  const offsetY = (80 - boxHeight) / 2;

  return (
    <svg
      viewBox="0 0 120 80"
      className="h-20 w-full max-w-[140px] shrink-0 rounded-lg border border-border/80 bg-background"
      aria-hidden
    >
      <rect
        x={offsetX}
        y={offsetY}
        width={boxWidth}
        height={boxHeight}
        rx="2"
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="1.5"
      />
      {label ? (
        <text
          x="60"
          y="74"
          textAnchor="middle"
          className="fill-muted text-[8px] font-medium"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
