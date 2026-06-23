"use client";

import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import type { UnitFloor } from "@/tools/room-coat/types/state";

interface EditorFloorTabsProps {
  floors: UnitFloor[];
  activeFloorId: string | null;
  onSelectFloor: (floorId: string) => void;
  onAddFloor: () => void;
}

export function EditorFloorTabs({
  floors,
  activeFloorId,
  onSelectFloor,
  onAddFloor,
}: EditorFloorTabsProps) {
  if (floors.length === 0) return null;

  return (
    <div
      className={`pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] ${EDITOR_CHROME}`}
    >
      <span className={`px-1 ${EDITOR_CHROME_MUTED}`}>Floors</span>
      {floors.map((floor) => {
        const active = floor.id === activeFloorId;
        return (
          <button
            key={floor.id}
            type="button"
            className={`rounded px-2 py-0.5 ${EDITOR_CLICKABLE} ${
              active
                ? "bg-sky-500/30 font-medium text-sky-100 ring-1 ring-sky-400/40"
                : "text-zinc-300 hover:bg-zinc-600/45"
            }`}
            onClick={() => onSelectFloor(floor.id)}
          >
            {floor.name}
          </button>
        );
      })}
      <button
        type="button"
        className={`rounded px-2 py-0.5 text-zinc-300 ${EDITOR_CLICKABLE} hover:bg-zinc-600/45`}
        onClick={onAddFloor}
      >
        + Add
      </button>
    </div>
  );
}
