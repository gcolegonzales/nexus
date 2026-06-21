"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AccordionCaret } from "./AccordionCaret";
import { PopoverPanel } from "./PopoverPanel";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  placeholder = "All",
  className = "",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  const triggerLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? selectedLabels[0]
        : `${values.length} selected`;

  function toggleValue(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <div
      ref={rootRef}
      className={`relative min-w-[12rem] ${open ? "z-50" : ""} ${className}`}
    >
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </span>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-surface px-3 py-2.5 text-left text-sm text-text transition-all duration-200 ease-out hover:border-primary/30 ${
          open ? "border-primary/40 shadow-sm" : "border-border"
        }`}
      >
        <span className={values.length === 0 ? "text-muted" : undefined}>
          {triggerLabel}
        </span>
        <AccordionCaret open={open} />
      </button>

      <PopoverPanel
        open={open}
        id={listboxId}
        align="end"
        className="max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface p-2 shadow-lg"
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted">No options</p>
        ) : (
          options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text transition-colors duration-150 hover:bg-border/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="h-4 w-4 cursor-pointer rounded border-border text-primary transition-colors duration-150"
                />
                <span>{option.label}</span>
              </label>
            );
          })
        )}

        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full cursor-pointer rounded-lg px-2 py-2 text-left text-sm text-muted transition-colors duration-150 hover:bg-border/40 hover:text-text"
          >
            Clear filter
          </button>
        )}
      </PopoverPanel>
    </div>
  );
}
