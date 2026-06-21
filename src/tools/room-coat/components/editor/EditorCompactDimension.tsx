"use client";

import type { UnitPreference } from "@/tools/room-coat/types/state";
import {
  imperialToMm,
  metricToMm,
  mmToImperial,
  mmToMetric,
} from "@/tools/room-coat/lib/units";
import { EDITOR_INPUT } from "@/tools/room-coat/components/editor/editor-chrome";

interface EditorCompactDimensionProps {
  label: string;
  valueMm: number;
  unit: UnitPreference;
  onChangeMm: (mm: number) => void;
}

export function EditorCompactDimension({
  label,
  valueMm,
  unit,
  onChangeMm,
}: EditorCompactDimensionProps) {
  if (unit === "metric") {
    const { meters, centimeters } = mmToMetric(valueMm);
    return (
      <label className="flex items-center gap-1 text-xs text-slate-400">
        {label}
        <input
          type="number"
          min={0}
          step={1}
          value={meters}
          onChange={(event) => {
            const m = Number(event.target.value);
            onChangeMm(metricToMm(Number.isFinite(m) ? m : 0, centimeters));
          }}
          className={`w-9 ${EDITOR_INPUT}`}
        />
        m
        <input
          type="number"
          min={0}
          step={1}
          value={centimeters}
          onChange={(event) => {
            const cm = Number(event.target.value);
            onChangeMm(metricToMm(meters, Number.isFinite(cm) ? cm : 0));
          }}
          className={`w-11 ${EDITOR_INPUT}`}
        />
        cm
      </label>
    );
  }

  const { feet, inches } = mmToImperial(valueMm);
  return (
    <label className="flex items-center gap-1 text-xs text-slate-400">
      {label}
      <input
        type="number"
        min={0}
        step={1}
        value={feet}
        onChange={(event) => {
          const ft = Number(event.target.value);
          onChangeMm(imperialToMm(Number.isFinite(ft) ? ft : 0, inches));
        }}
        className={`w-9 ${EDITOR_INPUT}`}
      />
      &apos;
      <input
        type="number"
        min={0}
        step={0.5}
        value={inches}
        onChange={(event) => {
          const inch = Number(event.target.value);
          onChangeMm(imperialToMm(feet, Number.isFinite(inch) ? inch : 0));
        }}
        className={`w-11 ${EDITOR_INPUT}`}
      />
      &quot;
    </label>
  );
}
