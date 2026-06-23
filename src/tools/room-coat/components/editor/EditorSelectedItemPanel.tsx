"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isFurnishingSurfaceId } from "@/tools/room-coat/lib/furnishing-surfaces";
import { CoatAccordionCard } from "@/tools/room-coat/components/CoatAccordionCard";
import { SurfacePaintControls } from "@/tools/room-coat/components/SurfacePaintControls";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";
import { Button } from "@nexus/next";

function categoryLabel(
  category: EditorHoverMeasurement["category"] | undefined,
): string | null {
  switch (category) {
    case "wall":
      return "Wall";
    case "floor":
      return "Floor";
    case "ceiling":
      return "Ceiling";
    case "door":
      return "Door";
    case "window":
      return "Window";
    case "baseboard":
      return "Baseboard";
    case "furnishing-face":
      return "Furnishing";
    default:
      return null;
  }
}

interface EditorSelectedItemPanelProps {
  selected: EditorHoverMeasurement | null;
  dimensionEditSlot?: ReactNode;
  onClearSelection?: () => void;
}

export function EditorSelectedItemPanel({
  selected,
  dimensionEditSlot,
  onClearSelection,
}: EditorSelectedItemPanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(Boolean(selected));
  }, [selected?.surfaceId, selected]);

  const badge = categoryLabel(selected?.category);
  const paintableSurface =
    selected && !isFurnishingSurfaceId(selected.surfaceId);

  return (
    <CoatAccordionCard
      title={selected?.title ?? "Selected item"}
      description={
        selected?.caption ??
        "Click a wall, floor, ceiling, or furnishing in the viewer to see dimensions and details."
      }
      open={open}
      onOpenChange={setOpen}
      headerActions={
        selected && onClearSelection ? (
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onClearSelection();
            }}
          >
            Clear
          </Button>
        ) : null
      }
    >
      {selected ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {badge}
                </span>
              ) : null}
              <span className="text-sm text-muted">{selected.caption}</span>
            </div>
            <p className="text-xl font-semibold tabular-nums leading-tight text-text sm:text-2xl">
              {selected.dimensions}
            </p>
          </section>

          {paintableSurface ? (
            <SurfacePaintControls
              surfaceId={selected.surfaceId}
              showSpaceDefaults
            />
          ) : selected.category === "furnishing-face" ? (
            <p className="border-t border-border pt-4 text-sm text-muted">
              Furnishing paint is not editable here. Select a room surface for
              paint overrides and defaults.
            </p>
          ) : null}

          {dimensionEditSlot}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Nothing selected yet. Use the select tool and click a surface or
          furnishing in the 3D view.
        </p>
      )}
    </CoatAccordionCard>
  );
}
