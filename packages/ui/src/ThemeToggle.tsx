"use client";

import { ToggleSwitch } from "./ToggleSwitch";
import { useTheme } from "./theme/ThemeProvider";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { isDark, toggleDarkMode } = useTheme();

  return (
    <ToggleSwitch
      checked={isDark}
      onChange={() => toggleDarkMode()}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      offIcon={<SunIcon className="h-3.5 w-3.5 text-amber-500" />}
      onIcon={<MoonIcon className="h-3.5 w-3.5 text-yellow-400" />}
    />
  );
}
