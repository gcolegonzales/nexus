"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { EDITOR_CLICKABLE, EDITOR_CHROME_BUTTON, EDITOR_CHROME_BUTTON_ACTIVE } from "@/tools/room-coat/components/editor/editor-chrome";

interface EditorIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

export function EditorIconButton({
  label,
  active = false,
  children,
  className = "",
  ...props
}: EditorIconButtonProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center ${EDITOR_CLICKABLE} ${
          active ? EDITOR_CHROME_BUTTON_ACTIVE : EDITOR_CHROME_BUTTON
        } ${className}`}
        {...props}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-white/10 bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}
