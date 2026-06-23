"use client";

import type { ReactNode } from "react";
import type { EditorTool } from "@/tools/room-coat/lib/editor-surfaces";
import { EDITOR_TOOLS } from "@/tools/room-coat/lib/editor-surfaces";
import {
  EDITOR_CHROME,
  EDITOR_Z_CHROME,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { EditorAddMenu } from "@/tools/room-coat/components/editor/EditorAddMenu";
import { EditorIconButton } from "@/tools/room-coat/components/editor/EditorIconButton";
import {
  CeilingsIcon,
  EDITOR_TOOLBAR_ICON_CLASS,
  EditorToolIcon,
} from "@/tools/room-coat/components/editor/EditorToolIcons";

interface EditorToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  showCeilings: boolean;
  onShowCeilingsChange: (show: boolean) => void;
  onAddFloor: () => void;
  children?: ReactNode;
}

export function EditorToolbar({
  tool,
  onToolChange,
  showCeilings,
  onShowCeilingsChange,
  onAddFloor,
  children,
}: EditorToolbarProps) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-3 flex w-full justify-center px-2"
      style={{ zIndex: EDITOR_Z_CHROME }}
    >
      <div
        className={`pointer-events-auto w-fit max-w-[min(100%,760px)] overflow-x-auto rounded-lg [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${EDITOR_CHROME}`}
      >
        <div className="inline-flex shrink-0 items-end gap-px px-1 py-1">
          {EDITOR_TOOLS.map(({ id, label, shortLabel }) => (
            <EditorIconButton
              key={id}
              label={label}
              caption={shortLabel}
              active={tool === id}
              onClick={() => onToolChange(id)}
            >
              <EditorToolIcon tool={id} className={EDITOR_TOOLBAR_ICON_CLASS} />
            </EditorIconButton>
          ))}

          <div className="mx-0.5 mb-1.5 h-12 w-px shrink-0 self-end bg-zinc-500/40" aria-hidden />

          <EditorAddMenu
            activeTool={tool}
            onSelectTool={onToolChange}
            onAddFloor={onAddFloor}
          />

          <div className="mx-0.5 mb-1.5 h-12 w-px shrink-0 self-end bg-zinc-500/40" aria-hidden />

          <EditorIconButton
            label={showCeilings ? "Hide ceilings" : "Show ceilings"}
            caption="Ceilings"
            active={showCeilings}
            onClick={() => onShowCeilingsChange(!showCeilings)}
          >
            <CeilingsIcon className={EDITOR_TOOLBAR_ICON_CLASS} />
          </EditorIconButton>
        </div>

        {children ? (
          <>
            <div className="mx-2 h-px bg-zinc-500/35" aria-hidden />
            <div className="px-2.5 py-2 text-sm">{children}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
