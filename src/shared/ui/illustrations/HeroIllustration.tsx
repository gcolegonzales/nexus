interface HeroIllustrationProps {
  className?: string;
}

export function HeroIllustration({ className = "" }: HeroIllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Central hub */}
      <circle cx="160" cy="140" r="48" fill="#38A3DB" fillOpacity="0.15" />
      <circle cx="160" cy="140" r="28" fill="#38A3DB" />
      <circle cx="160" cy="140" r="10" fill="white" fillOpacity="0.9" />

      {/* Orbiting tool nodes */}
      <g>
        <circle cx="160" cy="52" r="22" fill="#4ECDB0" fillOpacity="0.2" />
        <circle cx="160" cy="52" r="14" fill="#4ECDB0" />
        {/* Calendar icon */}
        <rect x="153" y="46" width="14" height="12" rx="2" fill="white" />
        <line x1="155" y1="50" x2="165" y2="50" stroke="#4ECDB0" strokeWidth="1" />
      </g>

      <g>
        <circle cx="248" cy="180" r="22" fill="#F07D5A" fillOpacity="0.2" />
        <circle cx="248" cy="180" r="14" fill="#F07D5A" />
        {/* Wrench hint */}
        <path
          d="M242 184 L246 180 L250 184 L248 186 Z"
          fill="white"
          transform="rotate(-45 248 180)"
        />
      </g>

      <g>
        <circle cx="72" cy="180" r="22" fill="#E8B44A" fillOpacity="0.2" />
        <circle cx="72" cy="180" r="14" fill="#E8B44A" />
        {/* House hint */}
        <path d="M68 184 L72 178 L76 184 V188 H68 V184Z" fill="white" />
      </g>

      <g>
        <circle cx="100" cy="72" r="18" fill="#7EC8F0" fillOpacity="0.25" />
        <circle cx="100" cy="72" r="11" fill="#7EC8F0" />
        <circle cx="100" cy="72" r="4" fill="white" />
      </g>

      <g>
        <circle cx="220" cy="72" r="18" fill="#4ECDB0" fillOpacity="0.25" />
        <circle cx="220" cy="72" r="11" fill="#4ECDB0" />
        <rect x="215" y="69" width="10" height="6" rx="1" fill="white" />
      </g>

      {/* Connection lines */}
      <line
        x1="160"
        y1="112"
        x2="160"
        y2="74"
        stroke="#38A3DB"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeDasharray="4 4"
      />
      <line
        x1="184"
        y1="158"
        x2="234"
        y2="172"
        stroke="#38A3DB"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeDasharray="4 4"
      />
      <line
        x1="136"
        y1="158"
        x2="86"
        y2="172"
        stroke="#38A3DB"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeDasharray="4 4"
      />
      <line
        x1="142"
        y1="124"
        x2="108"
        y2="88"
        stroke="#38A3DB"
        strokeWidth="1.5"
        strokeOpacity="0.25"
        strokeDasharray="3 3"
      />
      <line
        x1="178"
        y1="124"
        x2="212"
        y2="88"
        stroke="#38A3DB"
        strokeWidth="1.5"
        strokeOpacity="0.25"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
