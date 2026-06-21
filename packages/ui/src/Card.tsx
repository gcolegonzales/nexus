import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: boolean;
}

export function Card({
  children,
  className = "",
  interactive = false,
  padding = true,
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-[var(--shadow)] ${
        padding ? "p-6" : ""
      } ${interactive ? "card-lift" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
