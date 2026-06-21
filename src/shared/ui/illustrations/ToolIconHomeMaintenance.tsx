interface ToolIconHomeMaintenanceProps {
  className?: string;
  size?: number;
}

export function ToolIconHomeMaintenance({
  className = "",
  size = 24,
}: ToolIconHomeMaintenanceProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 11 L12 5 L20 11 V19 H15 V14 H9 V19 H4 V11Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M14 19 L18 15 L20 17 L16 21 L14 19Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
