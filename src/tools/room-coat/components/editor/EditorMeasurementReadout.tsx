"use client";

import type { ReactNode } from "react";
import {
  EDITOR_CHROME_MUTED,
  EDITOR_CHROME_PANEL,
} from "@/tools/room-coat/components/editor/editor-chrome";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";

export type { EditorHoverMeasurement };

interface EditorMeasurementReadoutProps {
  totalAreaLabel: string;
  totalArea: string;
  hover: EditorHoverMeasurement | null;
  selected: EditorHoverMeasurement | null;
  dimensionEditSlot?: ReactNode;
}

export function EditorMeasurementReadout({
  totalAreaLabel,
  totalArea,
  hover,
  selected,
  dimensionEditSlot,
}: EditorMeasurementReadoutProps) {
  const surfaceActive = selected ?? hover;
  const surfaceMode =
    selected && (!hover || hover.surfaceId === selected.surfaceId)
      ? "selected"
      : hover
        ? "hover"
        : selected
          ? "selected"
          : null;

  return (
    <div
      className={`min-w-[220px] max-w-[320px] rounded-lg px-3 py-2 text-xs leading-snug ${EDITOR_CHROME_PANEL} ${
        dimensionEditSlot ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={`${EDITOR_CHROME_MUTED} text-xs uppercase tracking-wide`}>
          {totalAreaLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-50">
          {totalArea}
        </span>
      </div>

      {surfaceActive ? (
        <div className="mt-2 border-t border-zinc-500/30 pt-2">
          {surfaceMode === "selected" && (
            <span className="mb-1 inline-block rounded bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
              Selected
            </span>
          )}
          <div className="truncate text-base font-medium text-zinc-100">
            {surfaceActive.title}
          </div>
          <div className={`${EDITOR_CHROME_MUTED} text-sm`}>{surfaceActive.caption}</div>
          <div className="mt-1 text-base font-semibold tabular-nums leading-tight text-sky-300">
            {surfaceActive.dimensions}
          </div>
        </div>
      ) : (
        <div className={`mt-2 border-t border-zinc-500/30 pt-2 ${EDITOR_CHROME_MUTED}`}>
          Hover or click for dimensions
        </div>
      )}

      {dimensionEditSlot}
    </div>
  );
}
