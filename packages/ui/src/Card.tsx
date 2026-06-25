import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: boolean;
  /**
   * Opt-in Title Case transformation. Card has no title/heading prop — all
   * content is passed as children — so this prop is accepted for API
   * consistency but has no effect. Callers that need a title should apply
   * titleCase() to the relevant child before passing it in.
   */
  titleCase?: boolean;
}

export function Card({
  children,
  className = "",
  interactive = false,
  padding = true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  titleCase: _titleCase = false,
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
