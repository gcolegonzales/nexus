"use client";

import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { Card } from "@nexus/ui";

export function ViewControls() {
  const { state, setShowCeilings } = useRoomCoat();

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-text">3D view</p>
        <p className="text-xs text-muted">
          Uncheck ceilings to open the top view. Walls stay solid — only the
          ceiling is hidden.
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={state.viewSettings.showCeilings}
          onChange={(event) => void setShowCeilings(event.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        Show ceilings
      </label>
    </Card>
  );
}
