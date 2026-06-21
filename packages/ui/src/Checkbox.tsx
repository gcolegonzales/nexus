"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> {
  label: ReactNode;
  hint?: string;
}

export function Checkbox({
  label,
  hint,
  className = "",
  id,
  disabled,
  checked = false,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
          disabled
            ? "cursor-default border-border bg-border/30"
            : checked
              ? "border-primary/35 bg-accent-sky/10 hover:border-primary/45"
              : "border-border bg-surface hover:border-primary/25 hover:bg-accent-sky/5"
        }`}
      >
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            id={inputId}
            type="checkbox"
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-md border shadow-sm transition ${
              checked
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface"
            } ${disabled ? "opacity-70" : "group-hover:border-primary/40"} peer-focus-visible:ring-2 peer-focus-visible:ring-primary/25 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background`}
          >
            <svg
              viewBox="0 0 12 12"
              className={`h-3 w-3 transition ${checked ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 6l2.5 2.5 4.5-5" />
            </svg>
          </span>
        </span>

        <span className="min-w-0 flex-1 space-y-0.5 pt-0.5">
          <span className="block text-sm font-medium text-text">{label}</span>
          {hint && <span className="block text-xs text-muted">{hint}</span>}
        </span>
      </label>
    </div>
  );
}
