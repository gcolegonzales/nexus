"use client";

import { useMemo, useState } from "react";
import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import { defaultCoatAccordionTitle } from "@/tools/room-coat/lib/coat-labels";
import { CoatAccordionCard } from "@/tools/room-coat/components/CoatAccordionCard";
import { CoatFieldsGrid } from "@/tools/room-coat/components/CoatFieldsGrid";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import type {
  Hallway,
  Paint,
  PlacedRoom,
  RoomCoat,
  SurfaceDescriptor,
} from "@/tools/room-coat/types/state";
import { Button } from "@nexus/next";

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
  const [addingException, setAddingException] = useState(false);
  const [draftSurfaceId, setDraftSurfaceId] = useState("");
  const [draftPaintId, setDraftPaintId] = useState<string | null>(null);

  const surfaces = useMemo(() => buildSurfaces(space), [space]);
  const exceptions = useMemo(
    () =>
      surfaces.filter((surface) => Boolean(space.surfaceOverrides[surface.id])),
    [space.surfaceOverrides, surfaces],
  );
  const availableSurfaces = useMemo(
    () =>
      surfaces.filter((surface) => !space.surfaceOverrides[surface.id]),
    [space.surfaceOverrides, surfaces],
  );

  function resetDraft() {
    setAddingException(false);
    setDraftSurfaceId("");
    setDraftPaintId(null);
  }

  function handleSaveException() {
    if (!draftSurfaceId || !draftPaintId) return;
    onSetOverride(draftSurfaceId, draftPaintId);
    resetDraft();
  }

  return (
    <CoatAccordionCard
      title={defaultCoatAccordionTitle(space.name)}
      description={
        spaceKind(space) === "hallway"
          ? "Hallway defaults override unit defaults. Surface exceptions win over both."
          : "Room defaults override unit defaults. Surface exceptions win over both."
      }
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-text">Room Defaults</h4>
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
                variant="ghost"
                onClick={() => {
                  setAddingException(true);
                  setDraftSurfaceId(availableSurfaces[0]?.id ?? "");
                }}
              >
                Add Exception
              </Button>
            )}
          </div>

          {exceptions.length === 0 && !addingException ? (
            <p className="text-sm text-muted">
              No surface exceptions. All surfaces use room defaults, then unit
              defaults.
            </p>
          ) : null}

          {exceptions.map((surface) => (
            <div
              key={surface.id}
              className="space-y-2 rounded-xl border border-border bg-surface/40 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-text">{surface.label}</p>
                <Button
                  variant="ghost"
                  onClick={() => onClearOverride(surface.id)}
                >
                  Remove
                </Button>
              </div>
              <PaintPicker
                label="Exception paint"
                paints={paints}
                value={space.surfaceOverrides[surface.id] ?? null}
                onChange={(paintId) => {
                  if (paintId) {
                    onSetOverride(surface.id, paintId);
                  } else {
                    onClearOverride(surface.id);
                  }
                }}
              />
            </div>
          ))}

          {addingException ? (
            <div className="space-y-3 rounded-xl border border-dashed border-primary/40 bg-background p-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-text">Surface</span>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  value={draftSurfaceId}
                  onChange={(event) => setDraftSurfaceId(event.target.value)}
                >
                  {availableSurfaces.map((surface) => (
                    <option key={surface.id} value={surface.id}>
                      {surface.label}
                    </option>
                  ))}
                </select>
              </label>
              <PaintPicker
                label="Exception paint"
                paints={paints}
                value={draftPaintId}
                onChange={setDraftPaintId}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!draftSurfaceId || !draftPaintId}
                  onClick={handleSaveException}
                >
                  Save Exception
                </Button>
                <Button variant="ghost" onClick={resetDraft}>
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
