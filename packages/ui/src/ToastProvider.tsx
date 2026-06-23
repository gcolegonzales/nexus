"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastTone = "success" | "error" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "title">> {
  id: string;
  tone: ToastTone;
  durationMs: number;
  description?: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions | string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneBorder: Record<ToastTone, string> = {
  success: "border-accent-mint/45",
  error: "border-danger/45",
  warning: "border-accent-amber/55",
};

const toneAccent: Record<ToastTone, string> = {
  success: "bg-accent-mint",
  error: "bg-danger",
  warning: "bg-accent-amber",
};

function ToastItemView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, item.durationMs);
    return () => window.clearTimeout(timer);
  }, [item.durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex gap-3 rounded-xl border bg-surface px-3.5 py-3 shadow-[var(--shadow-hover)] transition-all duration-200 ${toneBorder[item.tone]}`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneAccent[item.tone]}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-sm text-muted">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="btn-interactive -mr-1 shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-border/60 hover:text-text"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((options: ToastOptions | string) => {
    const opts = typeof options === "string" ? { title: options } : options;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const item: ToastItem = {
      id,
      title: opts.title,
      description: opts.description,
      tone: opts.tone ?? "success",
      durationMs: opts.durationMs ?? 3500,
    };
    setItems((current) => [...current.slice(-4), item]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) =>
        push({ title, description, tone: "success" }),
      error: (title, description) => push({ title, description, tone: "error" }),
      warning: (title, description) =>
        push({ title, description, tone: "warning" }),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-3 top-3 z-[200] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[22rem]">
              {items.map((item) => (
                <ToastItemView
                  key={item.id}
                  item={item}
                  onDismiss={() => dismiss(item.id)}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
