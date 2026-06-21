"use client";

import { coatCategoryLabel } from "@/tools/room-coat/lib/build-surfaces";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import type { Paint, RoomCoat } from "@/tools/room-coat/types/state";
import { Card } from "@nexus/ui";

interface RoomCoatPanelProps {
  paints: Paint[];
  coat: RoomCoat;
  onChange: (coat: RoomCoat) => void;
  title?: string;
  description?: string;
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

export function RoomCoatPanel({
  paints,
  coat,
  onChange,
  title = "Room coat",
  description = "Default paints for this room. Surfaces inherit these unless overridden.",
}: RoomCoatPanelProps) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COAT_FIELDS.map(({ key, category }) => (
          <PaintPicker
            key={key}
            label={coatCategoryLabel(category)}
            paints={paints}
            value={coat[key]}
            onChange={(paintId) => onChange({ ...coat, [key]: paintId })}
          />
        ))}
      </div>
    </Card>
  );
}
