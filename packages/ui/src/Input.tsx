import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  hint?: string;
}

export function Input({
  label,
  hint,
  className = "",
  id,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <input
        id={inputId}
        className={`w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  className = "",
  id,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <textarea
        id={inputId}
        className={`min-h-24 w-full cursor-pointer resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}
