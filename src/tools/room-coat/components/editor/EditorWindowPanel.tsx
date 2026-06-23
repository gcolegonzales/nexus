"use client";

import { EditorCompactDimension } from "@/tools/room-coat/components/editor/EditorCompactDimension";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { clampOpeningOffset } from "@/tools/room-coat/lib/openings-layout";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import {
  clampWindowOnWall,
  validateWindowPlacement,
} from "@/tools/room-coat/lib/window-surfaces";
import type { PlacedRoom, UnitPreference, Window } from "@/tools/room-coat/types/state";
import { Button } from "@nexus/next";

interface EditorWindowPanelProps {
  room: PlacedRoom;
  window: Window;
  unitPreference: UnitPreference;
  onWindowChange: (patch: Partial<Window>) => void;
  onRemove?: () => void;
}

export function EditorWindowPanel({
  room,
  window,
  unitPreference,
  onWindowChange,
  onRemove,
}: EditorWindowPanelProps) {
  const edge = wallSegmentByIndex(room, window.wallIndex);
  const wallLengthMm = edge?.lengthMm ?? 0;
  const placementCheck = validateWindowPlacement(room, window);

  function update(patch: Partial<Window>) {
    const next = { ...window, ...patch };
    const clamped = clampWindowOnWall(room, next);
    if (!clamped) return;
    onWindowChange(clamped);
  }

  function setOffsetFromCenter(centerMm: number) {
    if (!edge) return;
    update({
      offsetFromCornerMm: clampOpeningOffset(
        wallLengthMm,
        window.widthMm,
        centerMm,
      ),
    });
  }

  return (
    <div
      className={`pointer-events-auto mt-2 rounded-lg border border-sky-500/35 bg-zinc-900/95 px-3 py-2.5 ${EDITOR_CHROME}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-sky-300">
            Window settings
          </div>
          <div className="text-sm font-medium text-zinc-100">
            {room.name} · Wall {window.wallIndex + 1}
          </div>
        </div>
        {onRemove ? (
          <Button
            variant="danger"
            className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
            onClick={onRemove}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <div className={`flex flex-col gap-2 ${EDITOR_CHROME_MUTED}`}>
        <EditorCompactDimension
          label="Width"
          valueMm={window.widthMm}
          unit={unitPreference}
          variant="panel"
          onChangeMm={(widthMm) => {
            const centerMm = window.offsetFromCornerMm + window.widthMm / 2;
            update({
              widthMm,
              offsetFromCornerMm: edge
                ? clampOpeningOffset(wallLengthMm, widthMm, centerMm)
                : window.offsetFromCornerMm,
            });
          }}
        />
        <EditorCompactDimension
          label="Height"
          valueMm={window.heightMm}
          unit={unitPreference}
          variant="panel"
          onChangeMm={(heightMm) => update({ heightMm })}
        />
        <EditorCompactDimension
          label="Sill height"
          valueMm={window.sillHeightMm}
          unit={unitPreference}
          variant="panel"
          onChangeMm={(sillHeightMm) => update({ sillHeightMm })}
        />
        <EditorCompactDimension
          label="Along wall"
          valueMm={window.offsetFromCornerMm + window.widthMm / 2}
          unit={unitPreference}
          variant="panel"
          onChangeMm={setOffsetFromCenter}
        />
      </div>

      {!placementCheck.valid ? (
        <p className="mt-2 text-xs text-amber-300">{placementCheck.reason}</p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          Click the window from either side of the wall to select it. With it
          selected, click a wall to move it along that wall.
        </p>
      )}
    </div>
  );
}
