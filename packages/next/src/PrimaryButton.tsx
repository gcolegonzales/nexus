import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "./Button";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  children: ReactNode;
  compact?: boolean;
}

export function PrimaryButton({
  href,
  children,
  compact = false,
  className = "",
  ...props
}: PrimaryButtonProps) {
  const sizeClasses = compact
    ? "px-3 py-1.5 text-xs"
    : "min-w-[4.5rem] px-4 py-2.5 text-sm";

  return (
    <Button href={href} className={`${sizeClasses} ${className}`} {...props}>
      {children}
    </Button>
  );
}
