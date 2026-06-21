"use client";

import { useTheme } from "./theme/ThemeProvider";
import type { ThemeMode } from "./theme/theme";

const options: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeSelector() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={`btn-interactive rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ease-out cursor-pointer ${
              active
                ? "btn-primary shadow-sm"
                : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
