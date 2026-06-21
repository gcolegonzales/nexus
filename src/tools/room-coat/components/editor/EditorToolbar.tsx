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
    <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex flex-col items-center gap-1 px-2">
      <div
        className={`pointer-events-auto inline-flex items-center gap-px rounded-md px-0.5 py-0.5 ${EDITOR_CHROME}`}
      >
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

        <div className="mx-0.5 h-3.5 w-px bg-white/10" aria-hidden />

        <EditorIconButton
          label={showCeilings ? "Hide ceilings" : "Show ceilings"}
          active={showCeilings}
          onClick={() => onShowCeilingsChange(!showCeilings)}
        >
          <CeilingsIcon />
        </EditorIconButton>
      </div>

      {children ? (
        <div
          className={`pointer-events-auto flex max-w-[min(100%,560px)] flex-wrap items-center gap-1.5 rounded-md px-2 py-1 text-xs ${EDITOR_CHROME}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
