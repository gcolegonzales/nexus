"use client";

import { EditorCompactDimension } from "@/tools/room-coat/components/editor/EditorCompactDimension";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { roomFootprintDimensions } from "@/tools/room-coat/lib/room-shape";
import type { DimensionEditTarget } from "@/tools/room-coat/components/editor/dimension-edit";
import type { Furnishing, PlacedRoom, UnitPreference } from "@/tools/room-coat/types/state";
import { Button } from "@nexus/next";

interface EditorDimensionEditPanelProps {
  target: DimensionEditTarget;
  room: PlacedRoom | null;
  furnishing: Furnishing | null;
  unitPreference: UnitPreference;
  onRoomChange: (patch: { widthMm?: number; lengthMm?: number }) => void;
  onFurnishingChange: (patch: {
    widthMm?: number;
    depthMm?: number;
    heightMm?: number;
  }) => void;
  onDone: () => void;
}

export function EditorDimensionEditPanel({
  target,
  room,
  furnishing,
  unitPreference,
  onRoomChange,
  onFurnishingChange,
  onDone,
}: EditorDimensionEditPanelProps) {
  const label =
    target.kind === "room"
      ? (room?.name ?? "Room")
      : (furnishing?.label ?? "Furnishing");

  const roomFootprint =
    target.kind === "room" && room ? roomFootprintDimensions(room) : null;

  return (
    <div
      className={`pointer-events-auto mt-2 rounded-lg border border-sky-500/35 bg-zinc-900/95 px-3 py-2.5 ${EDITOR_CHROME}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-sky-300">
            Editing dimensions
          </div>
          <div className="text-sm font-medium text-zinc-100">{label}</div>
        </div>
        <Button
          variant="ghost"
          className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
          onClick={onDone}
        >
          Done
        </Button>
      </div>

      {target.kind === "room" && room && roomFootprint && (
        <div className={`flex flex-col gap-2 ${EDITOR_CHROME_MUTED}`}>
          <EditorCompactDimension
            label="W"
            valueMm={roomFootprint.widthMm}
            unit={unitPreference}
            variant="panel"
            onChangeMm={(widthMm) => onRoomChange({ widthMm })}
          />
          <EditorCompactDimension
            label="L"
            valueMm={roomFootprint.lengthMm}
            unit={unitPreference}
            variant="panel"
            onChangeMm={(lengthMm) => onRoomChange({ lengthMm })}
          />
        </div>
      )}

      {target.kind === "furnishing" && furnishing && (
        <div className={`flex flex-col gap-2 ${EDITOR_CHROME_MUTED}`}>
          <EditorCompactDimension
            label="W"
            valueMm={furnishing.widthMm}
            unit={unitPreference}
            variant="panel"
            onChangeMm={(widthMm) => onFurnishingChange({ widthMm })}
          />
          <EditorCompactDimension
            label="D"
            valueMm={furnishing.depthMm}
            unit={unitPreference}
            variant="panel"
            onChangeMm={(depthMm) => onFurnishingChange({ depthMm })}
          />
          <EditorCompactDimension
            label="H"
            valueMm={furnishing.heightMm}
            unit={unitPreference}
            variant="panel"
            onChangeMm={(heightMm) => onFurnishingChange({ heightMm })}
          />
        </div>
      )}
    </div>
  );
}
