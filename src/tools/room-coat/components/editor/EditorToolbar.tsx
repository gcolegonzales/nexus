"use client";

import type { ReactNode } from "react";
import type { EditorTool } from "@/tools/room-coat/lib/editor-surfaces";
import { EDITOR_TOOLS } from "@/tools/room-coat/lib/editor-surfaces";
import { EDITOR_CHROME } from "@/tools/room-coat/components/editor/editor-chrome";
import { EditorIconButton } from "@/tools/room-coat/components/editor/EditorIconButton";
import {
  CeilingsIcon,
  EditorToolIcon,
} from "@/tools/room-coat/components/editor/EditorToolIcons";

interface EditorToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  showCeilings: boolean;
  onShowCeilingsChange: (show: boolean) => void;
  children?: ReactNode;
}

export function EditorToolbar({
  tool,
  onToolChange,
  showCeilings,
  onShowCeilingsChange,
  children,
}: EditorToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex w-full flex-col items-center gap-1 px-2">
      <div
        className={`pointer-events-auto max-w-full overflow-x-auto rounded-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${EDITOR_CHROME}`}
      >
        <div className="inline-flex shrink-0 items-center gap-px px-0.5 py-0.5">
          {EDITOR_TOOLS.map(({ id, label }) => (
            <EditorIconButton
              key={id}
              label={label}
              active={tool === id}
              onClick={() => onToolChange(id)}
            >
              <EditorToolIcon tool={id} />
            </EditorIconButton>
          ))}

          <div className="mx-0.5 h-3.5 w-px shrink-0 bg-white/10" aria-hidden />

          <EditorIconButton
            label={showCeilings ? "Hide ceilings" : "Show ceilings"}
            active={showCeilings}
            onClick={() => onShowCeilingsChange(!showCeilings)}
          >
            <CeilingsIcon />
          </EditorIconButton>
        </div>
      </div>

      {children ? (
        <div
          className={`pointer-events-auto max-w-full overflow-x-auto rounded-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${EDITOR_CHROME}`}
        >
          <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1 text-xs">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
