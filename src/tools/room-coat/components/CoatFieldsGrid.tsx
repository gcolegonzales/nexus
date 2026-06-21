"use client";

import {
  coatCategoryLabel,
  defaultCoatFieldLabel,
} from "@/tools/room-coat/lib/build-surfaces";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import type { Paint, RoomCoat } from "@/tools/room-coat/types/state";

interface CoatFieldsGridProps {
  paints: Paint[];
  coat: RoomCoat;
  onChange: (coat: RoomCoat) => void;
  labelStyle?: "default" | "category";
}

const COAT_FIELDS: {
  key: keyof RoomCoat;
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
    <div className="grid gap-4 sm:grid-cols-2">
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
        />
      ))}
    </div>
  );
}
