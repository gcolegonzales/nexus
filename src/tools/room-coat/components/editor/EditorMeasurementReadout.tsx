"use client";

import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
} from "@/tools/room-coat/components/editor/editor-chrome";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";

export type { EditorHoverMeasurement };

interface EditorMeasurementReadoutProps {
  totalAreaLabel: string;
  totalArea: string;
  hover: EditorHoverMeasurement | null;
}

export function EditorMeasurementReadout({
  totalAreaLabel,
  totalArea,
  hover,
}: EditorMeasurementReadoutProps) {
  return (
    <div
      className={`pointer-events-none min-w-[180px] max-w-[260px] rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] leading-snug backdrop-blur-md ${EDITOR_CHROME} bg-slate-900/90`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={`${EDITOR_CHROME_MUTED} text-[10px] uppercase tracking-wide`}>
          {totalAreaLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums text-slate-100">
          {totalArea}
        </span>
      </div>

      {hover ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="truncate font-medium text-slate-100">{hover.title}</div>
          <div className={`${EDITOR_CHROME_MUTED} text-[10px]`}>{hover.caption}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-sky-200">
            {hover.dimensions}
          </div>
        </div>
      ) : (
        <div className={`mt-2 border-t border-white/10 pt-2 ${EDITOR_CHROME_MUTED}`}>
          Hover a surface for dimensions
        </div>
      )}
    </div>
  );
}
