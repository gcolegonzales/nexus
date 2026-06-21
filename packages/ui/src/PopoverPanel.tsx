import type { ReactNode } from "react";

interface PopoverPanelProps {
  open: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}

export function PopoverPanel({
  open,
  id,
  children,
  className = "",
  align = "start",
}: PopoverPanelProps) {
  const origin = align === "end" ? "origin-top-right" : "origin-top-left";

  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`absolute z-50 mt-2 transition-all duration-200 ease-out ${origin} ${
        open
          ? "visible translate-y-0 scale-100 opacity-100"
          : "pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
