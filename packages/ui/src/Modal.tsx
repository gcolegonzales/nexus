"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  panelClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  panelClassName = "",
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-[var(--overlay)] backdrop-blur-[2px] transition-opacity duration-350 ease-out animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-md animate-page-in rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)] ${panelClassName}`}
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
