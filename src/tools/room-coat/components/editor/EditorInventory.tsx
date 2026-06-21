"use client";

import { useEffect, useRef, useState } from "react";
import { PopoverPanel } from "@nexus/ui";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_BUTTON,
  EDITOR_CHROME_BUTTON_ACTIVE,
  EDITOR_CHROME_BUTTON_DANGER,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { LayersIcon } from "@/tools/room-coat/components/editor/EditorToolIcons";
import type { Hallway, PlacedRoom } from "@/tools/room-coat/types/state";

interface EditorInventoryProps {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  onRoomFocus: (placementId: string) => void;
  onRemoveRoom: (placementId: string, name: string) => void;
  onRemoveHallway: (id: string, name: string) => void;
}

export function EditorInventory({
  rooms,
  hallways,
  onRoomFocus,
  onRemoveRoom,
  onRemoveHallway,
}: EditorInventoryProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = rooms.length + hallways.length;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (count === 0) return null;

  return (
    <div
      ref={rootRef}
      className={`pointer-events-auto absolute bottom-2.5 right-2.5 ${open ? "z-20" : "z-10"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Unit contents, ${count} item${count === 1 ? "" : "s"}`}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-1 border border-white/10 px-1.5 py-1 text-[11px] font-medium backdrop-blur-md ${EDITOR_CLICKABLE} ${
          open ? EDITOR_CHROME_BUTTON_ACTIVE : `${EDITOR_CHROME_BUTTON} bg-slate-900/90`
        }`}
      >
        <LayersIcon />
        <span>{count}</span>
      </button>

      <PopoverPanel
        open={open}
        align="end"
        className={`bottom-full right-0 mb-1 !mt-0 w-52 rounded-md p-1.5 ${EDITOR_CHROME}`}
      >
        <p
          className={`mb-1 px-1 text-[10px] font-medium uppercase tracking-wide ${EDITOR_CHROME_MUTED}`}
        >
          In this unit
        </p>
        <ul className="flex max-h-36 flex-col gap-0.5 overflow-y-auto text-xs">
          {rooms.map((room) => (
            <li
              key={room.placementId}
              className="flex items-center justify-between gap-1 rounded"
            >
              <button
                type="button"
                className={`min-w-0 flex-1 truncate px-1 py-0.5 text-left ${EDITOR_CLICKABLE} ${EDITOR_CHROME_BUTTON}`}
                onClick={() => {
                  onRoomFocus(room.placementId);
                  setOpen(false);
                }}
              >
                {room.name}
              </button>
              <button
                type="button"
                className={`shrink-0 px-1 py-0.5 text-[10px] ${EDITOR_CLICKABLE} ${EDITOR_CHROME_BUTTON_DANGER}`}
                onClick={() => onRemoveRoom(room.placementId, room.name)}
              >
                Remove
              </button>
            </li>
          ))}
          {hallways.map((hallway) => (
            <li
              key={hallway.id}
              className="flex items-center justify-between gap-1 rounded"
            >
              <span className="min-w-0 flex-1 truncate px-1 py-0.5 text-slate-300">
                {hallway.name}
              </span>
              <button
                type="button"
                className={`shrink-0 px-1 py-0.5 text-[10px] ${EDITOR_CLICKABLE} ${EDITOR_CHROME_BUTTON_DANGER}`}
                onClick={() => onRemoveHallway(hallway.id, hallway.name)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </PopoverPanel>
    </div>
  );
}
