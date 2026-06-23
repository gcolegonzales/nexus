"use client";

import { useMemo, useState } from "react";
import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import { defaultCoatAccordionTitle } from "@/tools/room-coat/lib/coat-labels";
import { CoatAccordionCard } from "@/tools/room-coat/components/CoatAccordionCard";
import { CoatFieldsGrid } from "@/tools/room-coat/components/CoatFieldsGrid";
import { FloorFinishPicker } from "@/tools/room-coat/components/FloorFinishPicker";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import {
  defaultVariantIdForType,
  type FloorFinishType,
} from "@/tools/room-coat/lib/floor-finishes";
import {
  encodeFloorFinishOverride,
  isFloorFinishOverride,
  parseFloorFinishOverride,
} from "@/tools/room-coat/lib/floor-finish-override";
import type {
  Hallway,
  Paint,
  PlacedRoom,
  RoomCoat,
  SurfaceDescriptor,
} from "@/tools/room-coat/types/state";
import { Button } from "@nexus/next";
import { Select, useToast } from "@nexus/ui";

interface SpaceCoatAccordionProps {
  space: PlacedRoom | Hallway;
  paints: Paint[];
  coat: RoomCoat;
  onCoatChange: (coat: RoomCoat) => void;
  onSetOverride: (surfaceId: string, paintId: string) => void;
  onClearOverride: (surfaceId: string) => void;
}

function spaceKind(space: PlacedRoom | Hallway): "room" | "hallway" {
  return "placementId" in space ? "room" : "hallway";
}

function buildSurfaces(space: PlacedRoom | Hallway): SurfaceDescriptor[] {
  return "placementId" in space
    ? buildSurfacesForPlacedRoom(space)
    : buildSurfacesForHallway(space);
}

export function SpaceCoatAccordion({
  space,
  paints,
  coat,
  onCoatChange,
  onSetOverride,
  onClearOverride,
}: SpaceCoatAccordionProps) {
  const toast = useToast();
  const [addingException, setAddingException] = useState(false);
  const [draftSurfaceId, setDraftSurfaceId] = useState("");
  const [draftPaintId, setDraftPaintId] = useState<string | null>(null);
  const [draftFloorType, setDraftFloorType] = useState<FloorFinishType | null>(
    null,
  );
  const [draftFloorVariantId, setDraftFloorVariantId] = useState<string | null>(
    null,
  );

  const surfaces = useMemo(() => buildSurfaces(space), [space]);
  const paintableSurfaces = useMemo(
    () => surfaces.filter((surface) => surface.category !== "baseboard"),
    [surfaces],
  );
  const exceptions = useMemo(
    () =>
      paintableSurfaces.filter((surface) =>
        Boolean(space.surfaceOverrides[surface.id]),
      ),
    [paintableSurfaces, space.surfaceOverrides],
  );
  const availableSurfaces = useMemo(
    () =>
      paintableSurfaces.filter(
        (surface) => !space.surfaceOverrides[surface.id],
      ),
    [paintableSurfaces, space.surfaceOverrides],
  );

  function resetDraft() {
    setAddingException(false);
    setDraftSurfaceId("");
    setDraftPaintId(null);
    setDraftFloorType(null);
    setDraftFloorVariantId(null);
  }

  function handleSaveException() {
    if (!draftSurfaceId) return;
    const surface = surfaces.find((item) => item.id === draftSurfaceId);
    if (!surface) return;

    if (surface.category === "floor") {
      if (!draftFloorType || !draftFloorVariantId) return;
      onSetOverride(
        draftSurfaceId,
        encodeFloorFinishOverride(draftFloorType, draftFloorVariantId),
      );
    } else {
      if (!draftPaintId) return;
      onSetOverride(draftSurfaceId, draftPaintId);
    }
    resetDraft();
    toast.success("Exception saved");
  }

  const draftSurface = surfaces.find((item) => item.id === draftSurfaceId);
  const draftIsFloor = draftSurface?.category === "floor";
  const canSaveException = draftIsFloor
    ? Boolean(draftSurfaceId && draftFloorType && draftFloorVariantId)
    : Boolean(draftSurfaceId && draftPaintId);

  return (
    <CoatAccordionCard
      title={defaultCoatAccordionTitle(space.name)}
      description={
        spaceKind(space) === "hallway"
          ? "Hallway defaults override unit defaults. Surface exceptions win over both."
          : "Room defaults override unit defaults. Surface exceptions win over both."
      }
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-text">Room defaults</h4>
          <CoatFieldsGrid
            paints={paints}
            coat={coat}
            onChange={onCoatChange}
            labelStyle="category"
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-text">Exceptions</h4>
            {!addingException && availableSurfaces.length > 0 && (
              <Button
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                onClick={() => {
                  setAddingException(true);
                  setDraftSurfaceId(availableSurfaces[0]?.id ?? "");
                }}
              >
                Add exception
              </Button>
            )}
          </div>

          {exceptions.length === 0 && !addingException ? (
            <p className="text-sm text-muted">
              No surface exceptions. All surfaces use room defaults, then unit
              defaults.
            </p>
          ) : null}

          {exceptions.map((surface) => {
            const overrideValue = space.surfaceOverrides[surface.id];
            const floorOverride = overrideValue
              ? parseFloorFinishOverride(overrideValue)
              : null;

            return (
            <div
              key={surface.id}
              className="space-y-3 rounded-xl border border-border bg-surface/40 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-text">{surface.label}</p>
                <Button
                  variant="danger"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    onClearOverride(surface.id);
                    toast.success("Exception removed");
                  }}
                >
                  Remove
                </Button>
              </div>
              {surface.category === "floor" ? (
                <FloorFinishPicker
                  typeLabel="Finish type"
                  variantLabel="Color / style"
                  finishType={floorOverride?.type ?? null}
                  variantId={floorOverride?.variantId ?? null}
                  onChange={(finishType, variantId) => {
                    if (finishType && variantId) {
                      onSetOverride(
                        surface.id,
                        encodeFloorFinishOverride(finishType, variantId),
                      );
                    } else {
                      onClearOverride(surface.id);
                    }
                  }}
                />
              ) : (
                <PaintPicker
                  label="Exception paint"
                  paints={paints}
                  value={
                    overrideValue && !isFloorFinishOverride(overrideValue)
                      ? overrideValue
                      : null
                  }
                  onChange={(paintId) => {
                    if (paintId) {
                      onSetOverride(surface.id, paintId);
                    } else {
                      onClearOverride(surface.id);
                    }
                  }}
                />
              )}
            </div>
            );
          })}

          {addingException ? (
            <div className="space-y-4 rounded-xl border border-dashed border-primary/40 bg-background p-4">
              <Select
                label="Surface"
                allowUnset={false}
                value={draftSurfaceId || null}
                onChange={(value) => {
                  const nextSurfaceId = value ?? "";
                  setDraftSurfaceId(nextSurfaceId);
                  const nextSurface = surfaces.find(
                    (item) => item.id === nextSurfaceId,
                  );
                  if (nextSurface?.category === "floor") {
                    const defaultType: FloorFinishType = "concrete";
                    setDraftFloorType(defaultType);
                    setDraftFloorVariantId(defaultVariantIdForType(defaultType));
                    setDraftPaintId(null);
                  } else {
                    setDraftFloorType(null);
                    setDraftFloorVariantId(null);
                  }
                }}
                options={availableSurfaces.map((surface) => ({
                  value: surface.id,
                  label: surface.label,
                }))}
              />
              {draftIsFloor ? (
                <FloorFinishPicker
                  typeLabel="Finish type"
                  variantLabel="Color / style"
                  finishType={draftFloorType}
                  variantId={draftFloorVariantId}
                  onChange={(finishType, variantId) => {
                    setDraftFloorType(finishType);
                    setDraftFloorVariantId(variantId);
                  }}
                />
              ) : (
                <PaintPicker
                  label="Exception paint"
                  paints={paints}
                  value={draftPaintId}
                  onChange={setDraftPaintId}
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canSaveException}
                  onClick={handleSaveException}
                >
                  Save exception
                </Button>
                <Button variant="secondary" onClick={resetDraft}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CoatAccordionCard>
  );
}
