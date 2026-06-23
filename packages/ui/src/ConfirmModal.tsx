"use client";

import { Modal } from "./Modal";

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-base leading-relaxed text-text">{message}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          autoFocus={destructive}
          onClick={onCancel}
          className="btn-interactive inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:border-primary/30 hover:bg-accent-sky/10"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          autoFocus={!destructive}
          onClick={onConfirm}
          className={`btn-interactive inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm ${
            destructive
              ? "bg-danger text-white hover:bg-danger-hover hover:shadow-md"
              : "btn-primary"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
