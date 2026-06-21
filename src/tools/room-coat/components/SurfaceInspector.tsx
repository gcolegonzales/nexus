"use client";

import { findSurfaceInUnit } from "@/tools/room-coat/lib/build-surfaces";
import { paintSourceLabel } from "@/tools/room-coat/lib/coat-labels";
import { surfaceCategoryTitle } from "@/tools/room-coat/lib/surface-display-labels";
import {
  formatPaintLabel,
  resolveSurfacePaint,
} from "@/tools/room-coat/lib/resolve-paint";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import { isPlacedRoom, unitDefaultCoat } from "@/tools/room-coat/types/state";
import { Badge, Card } from "@nexus/ui";
import { Button } from "@nexus/next";

export function SurfaceInspector() {
  const {
    activeUnit,
    activePlacedRooms,
    activeHallways,
    activePaints,
    selectedSurfaceId,
    setSurfaceOverride,
    clearSurfaceOverride,
  } = useRoomCoat();

  if (!selectedSurfaceId) {
    return (
      <Card className="w-full">
        <p className="text-sm text-muted">
          Click a wall, ceiling, baseboard, or door in the 3D view to inspect
          paint and set overrides.
        </p>
      </Card>
    );
  }

  const match = findSurfaceInUnit(
    activePlacedRooms,
    activeHallways,
    selectedSurfaceId,
  );

  if (!match) {
    return (
      <Card className="w-full">
        <p className="text-sm text-muted">Selected surface not found.</p>
      </Card>
    );
  }

  const { surface, space } = match;
  const kind = isPlacedRoom(space) ? "room" : "hallway";
  const spaceId = isPlacedRoom(space) ? space.placementId : space.id;
  const resolved = resolveSurfacePaint(
    space,
    surface,
    activePaints,
    unitDefaultCoat(activeUnit),
  );
  const overrides = space.surfaceOverrides;
  const hasOverride = Boolean(overrides[surface.id]);

  return (
    <Card className="w-full space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text">{surface.label}</h3>
        <p className="mt-1 text-sm text-muted">
          {surfaceCategoryTitle(surface.category)}
          {kind === "hallway" ? " · Hallway" : ""}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text">Resolved paint</p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-6 w-6 rounded-lg border border-border"
            style={{ backgroundColor: resolved.hex }}
            aria-hidden
          />
          <span className="text-sm text-text">
            {formatPaintLabel(resolved.paint)}
          </span>
          <Badge
            variant={
              resolved.source === "override"
                ? "sky"
                : resolved.source === "unset"
                  ? "default"
                  : "mint"
            }
          >
            {paintSourceLabel(resolved.source)}
          </Badge>
        </div>
      </div>

      <PaintPicker
        label="Override paint"
        paints={activePaints}
        value={overrides[surface.id] ?? null}
        onChange={(paintId) => {
          if (paintId) {
            void setSurfaceOverride(spaceId, surface.id, paintId, kind);
          } else {
            void clearSurfaceOverride(spaceId, surface.id, kind);
          }
        }}
      />

      {hasOverride && (
        <Button
          variant="ghost"
          onClick={() => void clearSurfaceOverride(spaceId, surface.id, kind)}
        >
          Clear override (use room default)
        </Button>
      )}
    </Card>
  );
}
