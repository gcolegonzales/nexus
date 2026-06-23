"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EditorTool } from "@/tools/room-coat/lib/editor-surfaces";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_BUTTON,
  EDITOR_CHROME_BUTTON_ACTIVE,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";

export type EditorAddAction =
  | EditorTool
  | "add-floor";

interface EditorAddMenuProps {
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  onAddFloor: () => void;
}

const ADD_ITEMS: { id: EditorAddAction; label: string; description: string }[] =
  [
    {
      id: "add-room",
      label: "Add room",
      description: "Draw corners or drag a rectangle",
    },
    {
      id: "hallway",
      label: "Add hallway",
      description: "Connect rooms with a corridor",
    },
    {
      id: "open-walls",
      label: "Add wall opening",
      description: "Open a segment between two points",
    },
    {
      id: "add-floor",
      label: "Add floor",
      description: "Add another level to this unit",
    },
    {
      id: "add-door",
      label: "Add door",
      description: "Click a wall to place a door",
    },
    {
      id: "add-window",
      label: "Add window",
      description: "Click a wall to place a window",
    },
  ];

const ADD_TOOL_IDS = new Set<EditorAddAction>([
  "add-room",
  "hallway",
  "open-walls",
  "add-door",
  "add-window",
]);

export function EditorAddMenu({
  activeTool,
  onSelectTool,
  onAddFloor,
}: EditorAddMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const addToolActive = ADD_TOOL_IDS.has(activeTool);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(action: EditorAddAction) {
    setOpen(false);
    if (action === "add-floor") {
      onAddFloor();
      return;
    }
    onSelectTool(action);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className={`inline-flex flex-col items-center gap-0.5 rounded-md px-1 py-1 ${EDITOR_CLICKABLE} ${
          addToolActive ? EDITOR_CHROME_BUTTON_ACTIVE : EDITOR_CHROME_BUTTON
        }`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
        <span
          className={`whitespace-nowrap text-center text-[10px] font-medium leading-none ${
            addToolActive ? "text-white" : "text-zinc-400"
          }`}
        >
          Add
        </span>
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              className={`fixed z-[9999] min-w-[15rem] overflow-hidden rounded-lg border border-zinc-500/30 shadow-xl ${EDITOR_CHROME}`}
              style={{ top: position.top, left: position.left }}
            >
              {ADD_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left ${EDITOR_CLICKABLE} hover:bg-zinc-600/45 ${
                    item.id === activeTool ? "bg-sky-500/20" : ""
                  }`}
                  onClick={() => handleSelect(item.id)}
                >
                  <span className="text-sm font-medium text-zinc-100">
                    {item.label}
                  </span>
                  <span className="text-xs text-zinc-400">{item.description}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
