import type { ReactNode } from "react";
import { titleCase } from "./title-case";

export type BadgeVariant = "default" | "mint" | "amber" | "sky";

/** Apply titleCase to string leaves; pass non-string nodes through unchanged. */
function applyTitleCase(children: ReactNode): ReactNode {
  if (typeof children === "string") return titleCase(children);
  if (Array.isArray(children)) {
    return children.map((child) =>
      typeof child === "string" ? titleCase(child) : child
    );
  }
  return children;
}

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/12 text-primary",
  mint: "bg-accent-mint/15 text-[var(--badge-mint)]",
  amber: "bg-accent-amber/20 text-[var(--badge-amber)]",
  sky: "bg-accent-sky/25 text-[var(--badge-sky)]",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.8125rem] font-medium leading-none ${variantClasses[variant]} ${className}`}
    >
      {applyTitleCase(children)}
    </span>
  );
}
