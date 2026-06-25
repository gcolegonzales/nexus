interface ToolIconPetHealthProps {
  size?: number;
  className?: string;
}

export function ToolIconPetHealth({
  size = 26,
  className = "",
}: ToolIconPetHealthProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={className}
      fill="none"
    >
      {/* Pet paw print */}
      {/* Main pad */}
      <ellipse
        cx="16"
        cy="20"
        rx="6"
        ry="5"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Top-left toe */}
      <ellipse
        cx="9"
        cy="13"
        rx="2.5"
        ry="2"
        fill="currentColor"
        opacity="0.45"
      />
      {/* Top-right toe */}
      <ellipse
        cx="23"
        cy="13"
        rx="2.5"
        ry="2"
        fill="currentColor"
        opacity="0.45"
      />
      {/* Middle-left toe */}
      <ellipse
        cx="12"
        cy="11"
        rx="2.5"
        ry="2"
        fill="currentColor"
        opacity="0.45"
      />
      {/* Middle-right toe */}
      <ellipse
        cx="20"
        cy="11"
        rx="2.5"
        ry="2"
        fill="currentColor"
        opacity="0.45"
      />
      {/* Small heart / AI indicator inside main pad */}
      <path
        d="M16 22 l-1.8-1.6 a1.3 1.3 0 0 1 1.8-1.8 1.3 1.3 0 0 1 1.8 1.8 Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
