"use client";

import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
} from "@/tools/room-coat/components/editor/editor-chrome";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";

export type { EditorHoverMeasurement };

export interface EditorHallwayMeasurement {
  width: string;
  length: string;
  segment?: string;
}

interface EditorMeasurementReadoutProps {
  totalAreaLabel: string;
  totalArea: string;
  hover: EditorHoverMeasurement | null;
  hallway: EditorHallwayMeasurement | null;
}

export function EditorMeasurementReadout({
  totalAreaLabel,
  totalArea,
  hover,
  hallway,
}: EditorMeasurementReadoutProps) {
  const showHallway = hallway && !hover;

  return (
    <div
      className={`pointer-events-none min-w-[180px] max-w-[260px] rounded-md px-2.5 py-1.5 text-[11px] leading-snug ${EDITOR_CHROME}`}
    >
      <div className="space-y-0.5">
        <div className={`${EDITOR_CHROME_MUTED} text-[10px] uppercase tracking-wide`}>
          {totalAreaLabel}
        </div>
        <div className="text-sm font-semibold tabular-nums text-slate-100">
          {totalArea}
        </div>
      </div>

      {hover && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="truncate font-medium text-slate-100">{hover.title}</div>
          <div className={`${EDITOR_CHROME_MUTED} text-[10px]`}>{hover.caption}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-sky-200">
            {hover.dimensions}
          </div>
        </div>
      )}

      {showHallway && (
        <div className="mt-2 border-t border-white/10 pt-2 space-y-0.5">
          <div className="font-medium text-slate-100">Hallway draft</div>
          <div className="text-slate-200">
            <span className={EDITOR_CHROME_MUTED}>Width </span>
            {hallway.width}
          </div>
          <div className="text-slate-200">
            <span className={EDITOR_CHROME_MUTED}>Length </span>
            {hallway.length}
          </div>
          {hallway.segment && (
            <div className="text-slate-200">
              <span className={EDITOR_CHROME_MUTED}>Segment </span>
              {hallway.segment}
            </div>
          )}
        </div>
      )}

      {!hover && !showHallway && (
        <div className={`mt-2 border-t border-white/10 pt-2 ${EDITOR_CHROME_MUTED}`}>
          Hover a surface for dimensions
        </div>
      )}
    </div>
  );
}
