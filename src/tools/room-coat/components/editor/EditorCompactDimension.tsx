"use client";

import type { UnitPreference } from "@/tools/room-coat/types/state";
import {
  imperialToMm,
  metricToMm,
  mmToImperial,
  mmToMetric,
} from "@/tools/room-coat/lib/units";
import {
  EDITOR_DIMENSION_INPUT,
} from "@/tools/room-coat/components/editor/editor-chrome";

interface EditorCompactDimensionProps {
  label: string;
  valueMm: number;
  unit: UnitPreference;
  onChangeMm: (mm: number) => void;
  /** panel = bottom readout (larger). inline = toolbar row. */
  variant?: "inline" | "panel";
}

export function EditorCompactDimension({
  label,
  valueMm,
  unit,
  onChangeMm,
  variant = "inline",
}: EditorCompactDimensionProps) {
  const isPanel = variant === "panel";
  const inputClass = isPanel
    ? `${EDITOR_DIMENSION_INPUT} min-w-[3rem] w-14 text-sm`
    : `${EDITOR_DIMENSION_INPUT} min-w-[2.25rem] w-10 text-xs`;
  const inchInputClass = isPanel
    ? `${EDITOR_DIMENSION_INPUT} min-w-[3.25rem] w-16 text-sm`
    : `${EDITOR_DIMENSION_INPUT} min-w-[2.5rem] w-12 text-xs`;
  const labelClass = isPanel
    ? "w-4 shrink-0 text-sm font-medium text-zinc-300"
    : "shrink-0 text-sm text-slate-400";
  const rowClass = isPanel
    ? "flex items-center gap-2"
    : "flex items-center gap-1.5 text-sm text-slate-400";

  if (unit === "metric") {
    const { meters, centimeters } = mmToMetric(valueMm);
    return (
      <label className={rowClass}>
        <span className={labelClass}>{label}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={meters === 0 ? "" : meters}
          placeholder="0"
          onChange={(event) => {
            const m = Number(event.target.value);
            onChangeMm(metricToMm(Number.isFinite(m) ? m : 0, centimeters));
          }}
          className={inputClass}
        />
        <span className={isPanel ? "text-sm text-zinc-500" : undefined}>m</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          value={centimeters === 0 ? "" : centimeters}
          placeholder="0"
          onChange={(event) => {
            const cm = Number(event.target.value);
            onChangeMm(metricToMm(meters, Number.isFinite(cm) ? cm : 0));
          }}
          className={inchInputClass}
        />
        <span className={isPanel ? "text-sm text-zinc-500" : undefined}>cm</span>
      </label>
    );
  }

  const { feet, inches } = mmToImperial(valueMm);
  return (
    <label className={rowClass}>
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={feet === 0 ? "" : feet}
        placeholder="0"
        onChange={(event) => {
          const ft = Number(event.target.value);
          onChangeMm(imperialToMm(Number.isFinite(ft) ? ft : 0, inches));
        }}
        className={inputClass}
      />
      <span className={isPanel ? "text-sm text-zinc-500" : undefined}>&apos;</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={inches === 0 ? "" : inches}
        placeholder="0"
        onChange={(event) => {
          const inch = Number(event.target.value);
          onChangeMm(imperialToMm(feet, Number.isFinite(inch) ? inch : 0));
        }}
        className={inchInputClass}
      />
      <span className={isPanel ? "text-sm text-zinc-500" : undefined}>&quot;</span>
    </label>
  );
}
