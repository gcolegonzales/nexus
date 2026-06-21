import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconActionButton({
  label,
  children,
  className = "",
  ...props
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent p-2.5 text-muted transition-colors duration-200 hover:bg-primary/12 hover:text-primary active:bg-primary/16 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
