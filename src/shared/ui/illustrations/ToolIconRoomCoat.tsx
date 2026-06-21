interface ToolIconRoomCoatProps {
  size?: number;
  className?: string;
}

export function ToolIconRoomCoat({
  size = 26,
  className = "",
}: ToolIconRoomCoatProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={className}
      fill="none"
    >
      <rect
        x="5"
        y="9"
        width="22"
        height="16"
        rx="2"
        className="stroke-current"
        strokeWidth="1.75"
      />
      <path
        d="M5 14h22"
        className="stroke-current"
        strokeWidth="1.75"
      />
      <rect x="8" y="17" width="6" height="8" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="18" y="17" width="6" height="5" rx="1" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
