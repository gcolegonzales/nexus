"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  contextMenuActions,
  contextMenuTitle,
  type ContextMenuActionId,
  type ContextMenuState,
} from "@/tools/room-coat/lib/editor-context-menu";
import {
  EDITOR_CHROME_POPOVER,
  EDITOR_CLICKABLE,
  EDITOR_Z_CONTEXT_MENU,
} from "@/tools/room-coat/components/editor/editor-chrome";

interface EditorContextMenuProps {
  menu: ContextMenuState | null;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAction: (actionId: ContextMenuActionId) => void;
}

export function EditorContextMenu({
  menu,
  containerRef,
  onClose,
  onAction,
}: EditorContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!menu || !containerRef.current || !ref.current) {
      setPosition(null);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const menuRect = ref.current.getBoundingClientRect();
    const padding = 8;

    let x = menu.clientX - containerRect.left;
    let y = menu.clientY - containerRect.top;

    const maxX = containerRect.width - menuRect.width - padding;
    const maxY = containerRect.height - menuRect.height - padding;

    x = Math.max(padding, Math.min(x, maxX));
    y = Math.max(padding, Math.min(y, maxY));

    setPosition({ x, y });
  }, [containerRef, menu]);

  useEffect(() => {
    if (!menu) return;

    function onPointerDown(event: MouseEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const actions = contextMenuActions(menu.target);
  const title = contextMenuTitle(menu.target);

  return (
    <div
      ref={ref}
      className={`pointer-events-auto absolute min-w-[200px] max-w-[240px] overflow-hidden rounded-lg ${EDITOR_CHROME_POPOVER}`}
      style={{
        left: position?.x ?? menu.clientX,
        top: position?.y ?? menu.clientY,
        visibility: position ? "visible" : "hidden",
        zIndex: EDITOR_Z_CONTEXT_MENU,
      }}
    >
      <div
        className="pointer-events-none cursor-default select-none px-2.5 pt-2.5 pb-1.5"
        aria-hidden
      >
        <p className="truncate text-[11px] font-normal leading-snug text-zinc-300">
          {title}
        </p>
      </div>
      <div className="mx-2.5 border-t border-zinc-500/25" aria-hidden />
      <ul className="py-0.5" role="menu">
        {actions.map((action, index) => {
          const showSeparator =
            index > 0 && actions[index - 1].group !== action.group;
          return (
            <li key={action.id}>
              {showSeparator ? (
                <div
                  className="mx-2.5 my-0.5 border-t border-zinc-500/25"
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                role="menuitem"
                className={`block w-full cursor-pointer px-2.5 py-1.5 text-left text-xs transition-colors ${EDITOR_CLICKABLE} ${
                  action.destructive
                    ? "text-red-300 hover:bg-red-500/20"
                    : "text-zinc-100 hover:bg-zinc-600/50"
                }`}
                onClick={() => {
                  onAction(action.id);
                  onClose();
                }}
              >
                {action.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
