import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { titleCase } from "@nexus/ui";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary:
    "border border-border bg-surface text-text hover:border-primary/30 hover:bg-accent-sky/10",
  ghost: "text-muted hover:bg-border/60 hover:text-text",
  danger:
    "bg-danger text-white shadow-sm hover:bg-danger-hover hover:shadow-md",
};

export function Button({
  variant = "primary",
  className = "",
  href,
  children,
  // Default to "button" so a Button placed inside a <form> never submits it by
  // accident (HTML buttons default to type="submit"). Pass type="submit" to opt in.
  type = "button",
  ...props
}: ButtonProps) {
  const classes = `btn-interactive inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`;

  const casedChildren = applyTitleCase(children);

  if (href) {
    const isInternal = href.startsWith("/");
    if (isInternal) {
      return (
        <Link href={href} className={classes}>
          {casedChildren}
        </Link>
      );
    }

    return (
      <a href={href} className={classes}>
        {casedChildren}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {casedChildren}
    </button>
  );
}
