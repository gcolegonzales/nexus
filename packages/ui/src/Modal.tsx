"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
   * Unsaved-changes guard. When the modal is "dirty", user-initiated closes
   * (backdrop, Escape, ×) prompt for confirmation first. Calling `onClose`
   * programmatically (e.g. after a successful save) never prompts.
   *
   * If omitted, the modal AUTO-DETECTS dirtiness by watching for input/change
   * events on form fields inside it since it opened. Pass an explicit boolean to
   * use precise (value-compared) dirtiness instead — explicit always wins.
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
  dirty,
  titleCase = false,
}: ModalProps) {
  const titleId = useId();
  const confirm = useConfirm();
  const panelRef = useRef<HTMLDivElement>(null);
  const [autoDirty, setAutoDirty] = useState(false);
  const displayTitle = titleCase ? applyTitleCase(title) : title;

  // Effective dirtiness: an explicit `dirty` prop wins; otherwise fall back to
  // auto-detected input since the modal opened.
  const effectiveDirty = dirty !== undefined ? dirty : autoDirty;

  // Keep an always-current close handler in a ref so the listeners below never
  // capture a stale `effectiveDirty`/`onClose`.
  const requestCloseRef = useRef<() => void>(() => {});
  requestCloseRef.current = async () => {
    if (effectiveDirty) {
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
  };

  // Reset auto-dirty each time the modal opens.
  useEffect(() => {
    if (open) setAutoDirty(false);
  }, [open]);

  // Escape-to-close (guarded) + lock body scroll while open.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") void requestCloseRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Auto-detect dirtiness: any input/change event from a field inside the panel
  // marks the modal dirty (only used when no explicit `dirty` prop is given).
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const markDirty = () => setAutoDirty(true);
    panel.addEventListener("input", markDirty);
    panel.addEventListener("change", markDirty);

    return () => {
      panel.removeEventListener("input", markDirty);
      panel.removeEventListener("change", markDirty);
    };
  }, [open]);

  if (typeof document === "undefined" || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => void requestCloseRef.current()}
        className="absolute inset-0 cursor-pointer bg-[var(--overlay)] backdrop-blur-[2px] transition-opacity duration-350 ease-out animate-fade-in"
      />

      <div
        ref={panelRef}
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
