"use client";

import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
} from "@/tools/room-coat/components/editor/editor-chrome";

interface EditorMeasurementReadoutProps {
  totalAreaLabel: string;
  totalArea: string;
}

export function EditorMeasurementReadout({
  totalAreaLabel,
  totalArea,
}: EditorMeasurementReadoutProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] backdrop-blur-md ${EDITOR_CHROME} bg-slate-900/90`}
    >
      <span className={`${EDITOR_CHROME_MUTED} uppercase tracking-wide`}>
        {totalAreaLabel}
      </span>
      <span className="font-semibold tabular-nums text-slate-100">{totalArea}</span>
    </div>
  );
}
