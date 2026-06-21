"use client";

import { useEffect, useState, type RefObject } from "react";
import { EditorIconButton } from "@/tools/room-coat/components/editor/EditorIconButton";
import {
  ExitFullscreenIcon,
  FullscreenIcon,
} from "@/tools/room-coat/components/editor/EditorToolIcons";

interface EditorFullscreenToggleProps {
  containerRef: RefObject<HTMLElement | null>;
}

export function EditorFullscreenToggle({
  containerRef,
}: EditorFullscreenToggleProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    function syncFullscreen() {
      const active = document.fullscreenElement === containerRef.current;
      setFullscreen(active);
      if (containerRef.current) {
        containerRef.current.dataset.fullscreen = active ? "true" : "false";
      }
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [containerRef]);

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy.
    }
  }

  return (
    <EditorIconButton
      label={fullscreen ? "Exit full screen" : "Full screen"}
      active={fullscreen}
      onClick={() => void toggleFullscreen()}
    >
      {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
    </EditorIconButton>
  );
}
