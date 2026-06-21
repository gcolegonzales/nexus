"use client";

import { useId } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import {
  imperialToMm,
  metricToMm,
  mmToImperial,
  mmToMetric,
} from "@/tools/room-coat/lib/units";

interface DimensionInputProps {
  label: string;
  valueMm: number;
  onChangeMm: (mm: number) => void;
}

export function DimensionInput({
  label,
  valueMm,
  onChangeMm,
}: DimensionInputProps) {
  const id = useId();
  const { state } = useRoomCoat();
  const isMetric = state.unitPreference === "metric";

  if (isMetric) {
    const { meters, centimeters } = mmToMetric(valueMm);
    return (
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-m`} className="block space-y-1">
          <span className="text-xs font-medium text-muted">{label} (m)</span>
          <input
            id={`${id}-m`}
            type="number"
            min={0}
            step={1}
            value={meters}
            onChange={(event) => {
              const m = Number(event.target.value);
              const { centimeters: cm } = mmToMetric(valueMm);
              onChangeMm(metricToMm(Number.isFinite(m) ? m : 0, cm));
            }}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label htmlFor={`${id}-cm`} className="block space-y-1">
          <span className="text-xs font-medium text-muted">{label} (cm)</span>
          <input
            id={`${id}-cm`}
            type="number"
            min={0}
            step={0.1}
            value={centimeters}
            onChange={(event) => {
              const cm = Number(event.target.value);
              const { meters: m } = mmToMetric(valueMm);
              onChangeMm(metricToMm(m, Number.isFinite(cm) ? cm : 0));
            }}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>
    );
  }

  const { feet, inches } = mmToImperial(valueMm);
  return (
    <div className="grid grid-cols-2 gap-2">
      <label htmlFor={`${id}-ft`} className="block space-y-1">
        <span className="text-xs font-medium text-muted">{label} (ft)</span>
        <input
          id={`${id}-ft`}
          type="number"
          min={0}
          step={1}
          value={feet}
          onChange={(event) => {
            const ft = Number(event.target.value);
            const { inches: inch } = mmToImperial(valueMm);
            onChangeMm(imperialToMm(Number.isFinite(ft) ? ft : 0, inch));
          }}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <label htmlFor={`${id}-in`} className="block space-y-1">
        <span className="text-xs font-medium text-muted">{label} (in)</span>
        <input
          id={`${id}-in`}
          type="number"
          min={0}
          step={0.1}
          value={inches}
          onChange={(event) => {
            const inch = Number(event.target.value);
            const { feet: ft } = mmToImperial(valueMm);
            onChangeMm(imperialToMm(ft, Number.isFinite(inch) ? inch : 0));
          }}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
    </div>
  );
}
