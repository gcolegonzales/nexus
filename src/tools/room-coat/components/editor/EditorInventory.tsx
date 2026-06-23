"use client";

import { useEffect, useRef, useState } from "react";
import { PopoverPanel } from "@nexus/ui";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_PANEL,
  EDITOR_CHROME_BUTTON,
  EDITOR_CHROME_BUTTON_ACTIVE,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
  EDITOR_Z_CHROME,
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

const INVENTORY_REMOVE_BUTTON =
  "shrink-0 rounded-md border border-red-500/40 bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-200 shadow-sm shadow-red-950/30 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-red-50 active:bg-red-500/30";

function InventoryRow({
  label,
  onSelect,
  onRemove,
}: {
  label: string;
  onSelect?: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-transparent px-1 py-0.5 transition-colors hover:border-zinc-600/40 hover:bg-zinc-700/35">
      {onSelect ? (
        <button
          type="button"
          className={`min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-sm font-semibold leading-tight text-zinc-100 ${EDITOR_CLICKABLE} ${EDITOR_CHROME_BUTTON}`}
          onClick={onSelect}
        >
          {label}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate px-2 py-2 text-sm font-semibold leading-tight text-zinc-200">
          {label}
        </span>
      )}
      <button
        type="button"
        className={`${EDITOR_CLICKABLE} ${INVENTORY_REMOVE_BUTTON}`}
        onClick={onRemove}
      >
        Remove
      </button>
    </li>
  );
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
      className="pointer-events-auto absolute bottom-3 right-3"
      style={{ zIndex: EDITOR_Z_CHROME }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Unit contents, ${count} item${count === 1 ? "" : "s"}`}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${EDITOR_CHROME} ${EDITOR_CLICKABLE} ${
          open ? EDITOR_CHROME_BUTTON_ACTIVE : EDITOR_CHROME_BUTTON
        }`}
      >
        <LayersIcon />
        <span>{count}</span>
      </button>

      <PopoverPanel
        open={open}
        align="end"
        className={`bottom-full right-0 mb-2 !mt-0 w-72 rounded-xl p-3 ${EDITOR_CHROME_PANEL}`}
      >
        <p
          className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${EDITOR_CHROME_MUTED}`}
        >
          In this unit
        </p>
        <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto">
          {rooms.map((room) => (
            <InventoryRow
              key={room.placementId}
              label={room.name}
              onSelect={() => {
                onRoomFocus(room.placementId);
                setOpen(false);
              }}
              onRemove={() => onRemoveRoom(room.placementId, room.name)}
            />
          ))}
          {hallways.map((hallway) => (
            <InventoryRow
              key={hallway.id}
              label={hallway.name}
              onRemove={() => onRemoveHallway(hallway.id, hallway.name)}
            />
          ))}
        </ul>
      </PopoverPanel>
    </div>
  );
}
