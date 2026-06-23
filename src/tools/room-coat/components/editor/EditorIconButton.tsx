"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  EDITOR_CLICKABLE,
  EDITOR_CHROME_BUTTON,
  EDITOR_CHROME_BUTTON_ACTIVE,
  EDITOR_CHROME_MUTED,
} from "@/tools/room-coat/components/editor/editor-chrome";

interface EditorIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  /** Visible caption under the icon (for touch / no-hover access). */
  caption?: string;
  active?: boolean;
  children: ReactNode;
}

export function EditorIconButton({
  label,
  caption,
  active = false,
  children,
  className = "",
  ...props
}: EditorIconButtonProps) {
  const buttonTone = active ? EDITOR_CHROME_BUTTON_ACTIVE : EDITOR_CHROME_BUTTON;

  if (caption) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex flex-col items-center gap-0.5 rounded-md px-1 py-1 ${EDITOR_CLICKABLE} ${buttonTone} ${className}`}
        {...props}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          {children}
        </span>
        <span
          className={`whitespace-nowrap text-center text-[10px] font-medium leading-none ${
            active ? "text-white" : EDITOR_CHROME_MUTED
          }`}
        >
          {caption}
        </span>
      </button>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center ${EDITOR_CLICKABLE} ${buttonTone} ${className}`}
        {...props}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-zinc-400/30 bg-zinc-700/95 px-2 py-1 text-xs font-medium text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}
