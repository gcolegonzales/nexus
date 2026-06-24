"use client";

import {
  coatCategoryLabel,
  defaultCoatFieldLabel,
} from "@/tools/room-coat/lib/build-surfaces";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import { FloorFinishPicker } from "@/tools/room-coat/components/FloorFinishPicker";
import type { Paint, RoomCoat } from "@/tools/room-coat/types/state";

interface CoatFieldsGridProps {
  paints: Paint[];
  coat: RoomCoat;
  onChange: (coat: RoomCoat) => void;
  labelStyle?: "default" | "category";
}

const COAT_FIELDS: {
  key: keyof Pick<
    RoomCoat,
    "wallPaintId" | "baseboardPaintId" | "ceilingPaintId" | "doorPaintId"
  >;
  category: "wall" | "baseboard" | "ceiling" | "door";
}[] = [
  { key: "wallPaintId", category: "wall" },
  { key: "baseboardPaintId", category: "baseboard" },
  { key: "ceilingPaintId", category: "ceiling" },
  { key: "doorPaintId", category: "door" },
];

export function CoatFieldsGrid({
  paints,
  coat,
  onChange,
  labelStyle = "default",
}: CoatFieldsGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {COAT_FIELDS.map(({ key, category }) => (
          <PaintPicker
            key={key}
            label={
              labelStyle === "default"
                ? defaultCoatFieldLabel(category)
                : coatCategoryLabel(category)
            }
            paints={paints}
            value={coat[key]}
            onChange={(paintId) => onChange({ ...coat, [key]: paintId })}
            fullWidth
          />
        ))}
      </div>
      <FloorFinishPicker
        typeLabel={
          labelStyle === "default" ? "Default Floor" : coatCategoryLabel("floor")
        }
        finishType={coat.floorFinishType}
        variantId={coat.floorFinishVariantId}
        onChange={(finishType, variantId) =>
          onChange({
            ...coat,
            floorFinishType: finishType,
            floorFinishVariantId: variantId,
          })
        }
        allowUnsetType
        typeUnsetLabel={labelStyle === "default" ? "Not set" : "Unit default"}
      />
    </div>
  );
}
