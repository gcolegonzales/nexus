"use client";

import { useState } from "react";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_BUTTON,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
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
  const [minimized, setMinimized] = useState(false);
  const showHallway = hallway && !hover;

  if (minimized) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-label={`Show ${totalAreaLabel.toLowerCase()}`}
        onClick={() => setMinimized(false)}
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] backdrop-blur-md ${EDITOR_CLICKABLE} ${EDITOR_CHROME_BUTTON} bg-slate-900/90`}
      >
        <span className={`${EDITOR_CHROME_MUTED} uppercase tracking-wide`}>
          {totalAreaLabel}
        </span>
        <span className="font-semibold tabular-nums text-slate-100">{totalArea}</span>
        <svg
          className="h-3.5 w-3.5 text-slate-300"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={`pointer-events-auto min-w-[180px] max-w-[260px] rounded-md px-2.5 py-1.5 text-[11px] leading-snug ${EDITOR_CHROME}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className={`${EDITOR_CHROME_MUTED} text-[10px] uppercase tracking-wide`}>
            {totalAreaLabel}
          </div>
          <div className="text-sm font-semibold tabular-nums text-slate-100">
            {totalArea}
          </div>
        </div>
        <button
          type="button"
          aria-label="Minimize area readout"
          title="Minimize"
          onClick={() => setMinimized(true)}
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded ${EDITOR_CLICKABLE} ${EDITOR_CHROME_BUTTON}`}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
        <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
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
