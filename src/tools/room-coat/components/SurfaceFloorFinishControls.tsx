"use client";

import {
  coatCategoryLabel,
  findSurfaceInUnit,
} from "@/tools/room-coat/lib/build-surfaces";
import {
  encodeFloorFinishOverride,
  isFloorFinishOverride,
  parseFloorFinishOverride,
} from "@/tools/room-coat/lib/floor-finish-override";
import {
  floorFinishSourceLabel,
  resolveFloorFinishForSpace,
} from "@/tools/room-coat/lib/resolve-floor-finish";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { CoatFieldsGrid } from "@/tools/room-coat/components/CoatFieldsGrid";
import { FloorFinishPicker } from "@/tools/room-coat/components/FloorFinishPicker";
import { FloorFinishProductDetails } from "@/tools/room-coat/components/FloorFinishProductDetails";
import {
  isPlacedRoom,
  unitDefaultCoat,
  type Hallway,
  type PlacedRoom,
} from "@/tools/room-coat/types/state";
import { Badge, useToast } from "@nexus/ui";
import { Button } from "@nexus/next";

interface SurfaceFloorFinishControlsProps {
  surfaceId: string;
  showHeader?: boolean;
  showSpaceDefaults?: boolean;
}

function useSurfaceMatch(surfaceId: string) {
  const { allPlacedRooms, allHallways } = useRoomCoat();
  return findSurfaceInUnit(allPlacedRooms, allHallways, surfaceId);
}

export function SurfaceFloorFinishControls({
  surfaceId,
  showHeader = false,
  showSpaceDefaults = false,
}: SurfaceFloorFinishControlsProps) {
  const {
    activeUnit,
    setSurfaceOverride,
    clearSurfaceOverride,
    setRoomCoat,
    setHallwayCoat,
    state,
  } = useRoomCoat();
  const toast = useToast();

  const match = useSurfaceMatch(surfaceId);
  if (!match) return null;

  const { surface, space } = match;
  const kind = isPlacedRoom(space) ? "room" : "hallway";
  const spaceId = isPlacedRoom(space) ? space.placementId : space.id;
  const resolved = resolveFloorFinishForSpace(
    space,
    surface.id,
    unitDefaultCoat(activeUnit),
  );
  const overrideValue = space.surfaceOverrides[surface.id];
  const parsedOverride = overrideValue
    ? parseFloorFinishOverride(overrideValue)
    : null;
  const hasOverride = Boolean(parsedOverride);

  function updateSpaceCoat(coat: PlacedRoom["coat"] | Hallway["coat"]) {
    if (kind === "room") {
      void setRoomCoat(spaceId, coat);
    } else {
      void setHallwayCoat(spaceId, coat);
    }
  }

  function setOverride(
    finishType: typeof resolved.type,
    variantId: string,
  ) {
    void setSurfaceOverride(
      spaceId,
      surface.id,
      encodeFloorFinishOverride(finishType, variantId),
      kind,
    );
  }

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <h3 className="text-lg font-semibold text-text">{surface.label}</h3>
          <p className="mt-1 text-sm text-muted">
            Floor finish · {kind === "hallway" ? "Hallway" : "Room"}
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-text">Floor finish</h4>

        <div className="inline-flex flex-wrap items-center gap-2.5 rounded-xl border border-border/70 bg-surface/50 px-3.5 py-2.5">
          <span
            className="h-6 w-6 shrink-0 rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: resolved.hex }}
            aria-hidden
          />
          <span className="text-sm font-medium text-text">{resolved.label}</span>
          <Badge
            variant={
              resolved.source === "override"
                ? "sky"
                : resolved.source === "default"
                  ? "default"
                  : "mint"
            }
          >
            {floorFinishSourceLabel(resolved.source)}
          </Badge>
        </div>

        <FloorFinishPicker
          typeLabel="Override type"
          variantLabel="Override color / style"
          finishType={parsedOverride?.type ?? resolved.type}
          variantId={parsedOverride?.variantId ?? resolved.variantId}
          onChange={(finishType, variantId) => {
            if (!finishType || !variantId) {
              void clearSurfaceOverride(spaceId, surface.id, kind);
              return;
            }
            setOverride(finishType, variantId);
          }}
          allowUnsetType
          typeUnsetLabel="Use room default"
        />

        {hasOverride ? (
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            onClick={() => {
              void clearSurfaceOverride(spaceId, surface.id, kind);
              toast.success("Override cleared");
            }}
          >
            Clear override
          </Button>
        ) : null}

        <FloorFinishProductDetails
          finish={resolved}
          unitPreference={state.unitPreference}
        />
      </section>

      {showSpaceDefaults ? (
        <section className="space-y-3 border-t border-border pt-4">
          <div>
            <h4 className="text-sm font-semibold text-text">
              {space.name} defaults
            </h4>
            <p className="mt-0.5 text-sm text-muted">
              {kind === "hallway"
                ? "Hallway floor defaults override unit defaults unless this floor has an exception."
                : "Room floor defaults override unit defaults unless this floor has an exception."}
            </p>
          </div>
          <CoatFieldsGrid
            paints={activeUnit.paints}
            coat={space.coat}
            onChange={updateSpaceCoat}
            labelStyle="category"
          />
        </section>
      ) : null}
    </div>
  );
}

export function isFloorSurfaceOverride(value: string | undefined): boolean {
  return Boolean(value && isFloorFinishOverride(value));
}
