"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AccordionCaret } from "./AccordionCaret";

export interface SelectOption {
  value: string;
  label: string;
  leading?: ReactNode;
}

interface SelectProps {
  label?: string;
  hint?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowUnset?: boolean;
  unsetLabel?: string;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

const MENU_GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;
const MAX_MENU_HEIGHT_PX = 256;

function estimateMenuHeight(
  optionCount: number,
  allowUnset: boolean,
): number {
  const itemCount = optionCount + (allowUnset ? 1 : 0);
  if (itemCount === 0) return 48;
  return Math.min(MAX_MENU_HEIGHT_PX, itemCount * 40 + 12);
}

function computeMenuPosition(
  trigger: HTMLElement,
  menu: HTMLElement | null,
  optionCount: number,
  allowUnset: boolean,
): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const measuredHeight = menu?.offsetHeight ?? 0;
  const estimatedHeight = estimateMenuHeight(optionCount, allowUnset);
  const menuHeight = measuredHeight || estimatedHeight;

  const spaceBelow =
    window.innerHeight - rect.bottom - VIEWPORT_PADDING_PX;
  const spaceAbove = rect.top - VIEWPORT_PADDING_PX;

  const fitsBelow = spaceBelow >= menuHeight + MENU_GAP_PX;
  const fitsAbove = spaceAbove >= menuHeight + MENU_GAP_PX;
  const openUpward =
    !fitsBelow && (fitsAbove || spaceAbove > spaceBelow);

  const maxHeight = openUpward
    ? Math.min(MAX_MENU_HEIGHT_PX, Math.max(120, spaceAbove - MENU_GAP_PX))
    : Math.min(MAX_MENU_HEIGHT_PX, Math.max(120, spaceBelow - MENU_GAP_PX));

  let left = rect.left;
  const width = rect.width;
  if (left + width > window.innerWidth - VIEWPORT_PADDING_PX) {
    left = window.innerWidth - VIEWPORT_PADDING_PX - width;
  }
  left = Math.max(VIEWPORT_PADDING_PX, left);

  if (openUpward) {
    return {
      bottom: window.innerHeight - rect.top + MENU_GAP_PX,
      left,
      width,
      maxHeight,
    };
  }

  return {
    top: rect.bottom + MENU_GAP_PX,
    left,
    width,
    maxHeight,
  };
}

export function Select({
  label,
  hint,
  options,
  value,
  onChange,
  placeholder = "Choose…",
  allowUnset = false,
  unsetLabel = "Not set",
  className = "",
  fullWidth = false,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setMenuPosition(
        computeMenuPosition(
          trigger,
          menuRef.current,
          options.length,
          allowUnset,
        ),
      );
    }

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [allowUnset, open, options.length]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selected = options.find((option) => option.value === value) ?? null;
  const triggerLabel =
    selected?.label ??
    (value === null && allowUnset ? unsetLabel : placeholder);
  const isUnset = value === null || value === "";

  const menu =
    open && menuPosition ? (
      <div
        ref={menuRef}
        id={listboxId}
        role="listbox"
        style={{
          position: "fixed",
          ...(menuPosition.top !== undefined
            ? { top: menuPosition.top }
            : { bottom: menuPosition.bottom }),
          left: menuPosition.left,
          width: menuPosition.width,
          maxHeight: menuPosition.maxHeight,
          zIndex: 10000,
        }}
        className="overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ul className="space-y-0.5">
          {allowUnset ? (
            <li role="option" aria-selected={value === null}>
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-border/40 ${
                  value === null ? "bg-primary/10 text-text" : "text-muted"
                }`}
              >
                {unsetLabel}
              </button>
            </li>
          ) : null}
          {options.length === 0 ? (
            <li className="px-2.5 py-2 text-sm text-muted">No options</li>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-border/40 ${
                      isSelected
                        ? "bg-primary/10 font-medium text-text"
                        : "text-text"
                    }`}
                  >
                    {option.leading}
                    <span className="min-w-0 whitespace-normal leading-snug">
                      {option.label}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div
      ref={rootRef}
      className={`relative ${fullWidth ? "block w-full" : "inline-block"} ${className}`}
    >
      {label ? (
        <span className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) setOpen((current) => !current);
        }}
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-surface py-2.5 text-left text-sm text-text transition-all duration-200 ease-out hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-primary/40 shadow-sm" : "border-border"
        } ${
          fullWidth
            ? "w-full px-3.5"
            : "w-[min(100%,22rem)] min-w-[16rem] px-3.5"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 truncate">
          {selected?.leading}
          <span
            className={
              isUnset && !selected ? "truncate text-muted" : "truncate"
            }
          >
            {triggerLabel}
          </span>
        </span>
        <span className="flex shrink-0 items-center pl-2 pr-0.5">
          <AccordionCaret open={open} />
        </span>
      </button>

      {hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
