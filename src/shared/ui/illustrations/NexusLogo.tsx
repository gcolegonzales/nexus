interface NexusLogoProps {
  className?: string;
  size?: number;
}

export function NexusLogo({ className = "", size = 32 }: NexusLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" fill="#38A3DB" fillOpacity="0.12" />
      <circle cx="16" cy="16" r="5" fill="#38A3DB" />
      <circle cx="16" cy="5" r="2.5" fill="#4ECDB0" />
      <circle cx="25.5" cy="20.5" r="2.5" fill="#F07D5A" />
      <circle cx="6.5" cy="20.5" r="2.5" fill="#E8B44A" />
      <line
        x1="16"
        y1="11"
        x2="16"
        y2="7.5"
        stroke="#4ECDB0"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="20.2"
        y1="18.2"
        x2="23.2"
        y2="19.8"
        stroke="#F07D5A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="11.8"
        y1="18.2"
        x2="8.8"
        y2="19.8"
        stroke="#E8B44A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
