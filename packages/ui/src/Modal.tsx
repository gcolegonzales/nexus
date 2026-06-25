"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "./ConfirmProvider";
import { titleCase as applyTitleCase } from "./title-case";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  panelClassName?: string;
  /**
   * When true, user-initiated close affordances (backdrop, Escape, ×) prompt for
   * confirmation before discarding unsaved edits. Calling `onClose` programmatically
   * (e.g. after a successful save) never prompts. Defaults to false.
   */
  dirty?: boolean;
  /** When true, run the title through titleCase(). Defaults to false. */
  titleCase?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  panelClassName = "",
  dirty = false,
  titleCase = false,
}: ModalProps) {
  const titleId = useId();
  const confirm = useConfirm();
  const displayTitle = titleCase ? applyTitleCase(title) : title;

  // Guarded close — only used by the internal user-initiated affordances.
  // `onClose` itself is never wrapped, so post-save programmatic closes never prompt.
  async function requestClose() {
    if (dirty) {
      const confirmed = await confirm({
        title: "Unsaved Changes",
        message: "Unsaved changes will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep Editing",
        destructive: true,
      });
      if (!confirmed) return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        void requestClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty]);

  if (typeof document === "undefined" || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => void requestClose()}
        className="absolute inset-0 cursor-pointer bg-[var(--overlay)] backdrop-blur-[2px] transition-opacity duration-350 ease-out animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-md animate-page-in rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)] ${panelClassName}`}
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {displayTitle}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
