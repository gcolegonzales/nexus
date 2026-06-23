"use client";

import {
  coatCategoryLabel,
  findSurfaceInUnit,
} from "@/tools/room-coat/lib/build-surfaces";
import { paintSourceLabel } from "@/tools/room-coat/lib/coat-labels";
import { surfaceCategoryTitle } from "@/tools/room-coat/lib/surface-display-labels";
import {
  formatPaintLabel,
  resolveSurfacePaint,
} from "@/tools/room-coat/lib/resolve-paint";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { CoatFieldsGrid } from "@/tools/room-coat/components/CoatFieldsGrid";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import { SurfaceFloorFinishControls } from "@/tools/room-coat/components/SurfaceFloorFinishControls";
import {
  isPlacedRoom,
  unitDefaultCoat,
  type Hallway,
  type PlacedRoom,
} from "@/tools/room-coat/types/state";
import { Badge, useToast } from "@nexus/ui";
import { Button } from "@nexus/next";

interface SurfacePaintControlsProps {
  surfaceId: string;
  showHeader?: boolean;
  showSpaceDefaults?: boolean;
}

function useSurfaceMatch(surfaceId: string) {
  const { allPlacedRooms, allHallways } = useRoomCoat();
  return findSurfaceInUnit(allPlacedRooms, allHallways, surfaceId);
}

export function SurfacePaintControls({
  surfaceId,
  showHeader = false,
  showSpaceDefaults = false,
}: SurfacePaintControlsProps) {
  const {
    activeUnit,
    activePaints,
    setSurfaceOverride,
    clearSurfaceOverride,
    setRoomCoat,
    setHallwayCoat,
  } = useRoomCoat();
  const toast = useToast();

  const match = useSurfaceMatch(surfaceId);
  if (!match) return null;

  if (match.surface.category === "floor") {
    return (
      <SurfaceFloorFinishControls
        surfaceId={surfaceId}
        showHeader={showHeader}
        showSpaceDefaults={showSpaceDefaults}
      />
    );
  }

  const { surface, space } = match;
  const kind = isPlacedRoom(space) ? "room" : "hallway";
  const spaceId = isPlacedRoom(space) ? space.placementId : space.id;
  const isScopedBaseboard = surface.category === "baseboard";
  const resolved = resolveSurfacePaint(
    space,
    surface,
    activePaints,
    unitDefaultCoat(activeUnit),
  );
  const overrides = space.surfaceOverrides;
  const coatPaintId = space.coat.baseboardPaintId;
  const hasOverride = isScopedBaseboard
    ? coatPaintId !== null
    : Boolean(overrides[surface.id]);

  function setBaseboardPaint(paintId: string | null) {
    const nextCoat = { ...space.coat, baseboardPaintId: paintId };
    if (kind === "room") {
      void setRoomCoat(spaceId, nextCoat);
    } else {
      void setHallwayCoat(spaceId, nextCoat);
    }
  }

  function updateSpaceCoat(coat: PlacedRoom["coat"] | Hallway["coat"]) {
    if (kind === "room") {
      void setRoomCoat(spaceId, coat);
    } else {
      void setHallwayCoat(spaceId, coat);
    }
  }

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <h3 className="text-lg font-semibold text-text">
            {isScopedBaseboard
              ? `${space.name} — ${coatCategoryLabel("baseboard")}`
              : surface.label}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {isScopedBaseboard
              ? "One paint for every baseboard in this space"
              : surfaceCategoryTitle(surface.category)}
            {kind === "hallway" && !isScopedBaseboard ? " · Hallway" : ""}
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-text">Paint</h4>

        <div className="inline-flex flex-wrap items-center gap-2.5 rounded-xl border border-border/70 bg-surface/50 px-3.5 py-2.5">
          <span
            className="h-6 w-6 shrink-0 rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: resolved.hex }}
            aria-hidden
          />
          <span className="text-sm font-medium text-text">
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

        <PaintPicker
          label={isScopedBaseboard ? "Baseboard paint" : "Override paint"}
          paints={activePaints}
          value={
            isScopedBaseboard ? coatPaintId : (overrides[surface.id] ?? null)
          }
          onChange={(paintId) => {
            if (isScopedBaseboard) {
              setBaseboardPaint(paintId);
              return;
            }
            if (paintId) {
              void setSurfaceOverride(spaceId, surface.id, paintId, kind);
            } else {
              void clearSurfaceOverride(spaceId, surface.id, kind);
            }
          }}
        />

        {hasOverride ? (
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            onClick={() => {
              if (isScopedBaseboard) {
                setBaseboardPaint(null);
              } else {
                void clearSurfaceOverride(spaceId, surface.id, kind);
              }
              toast.success("Override cleared");
            }}
          >
            {isScopedBaseboard
              ? "Clear baseboard paint"
              : "Clear override"}
          </Button>
        ) : null}
      </section>

      {showSpaceDefaults ? (
        <section className="space-y-3 border-t border-border pt-4">
          <div>
            <h4 className="text-sm font-semibold text-text">
              {space.name} defaults
            </h4>
            <p className="mt-0.5 text-sm text-muted">
              {kind === "hallway"
                ? "Hallway defaults override unit defaults unless a surface has an exception."
                : "Room defaults override unit defaults unless a surface has an exception."}
            </p>
          </div>
          <CoatFieldsGrid
            paints={activePaints}
            coat={space.coat}
            onChange={updateSpaceCoat}
            labelStyle="category"
          />
        </section>
      ) : null}
    </div>
  );
}
