"use client";

import type { Paint } from "@/tools/room-coat/types/state";
import { formatPaintLabel } from "@/tools/room-coat/lib/resolve-paint";
import { Badge, Card } from "@nexus/ui";
import { Button } from "@nexus/next";

interface PaintPickerProps {
  paints: Paint[];
  value: string | null;
  onChange: (paintId: string | null) => void;
  allowUnset?: boolean;
  label?: string;
}

export function PaintPicker({
  paints,
  value,
  onChange,
  allowUnset = true,
  label = "Paint",
}: PaintPickerProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value : null)
        }
        className="w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {allowUnset && <option value="">Not set</option>}
        {paints.map((paint) => (
          <option key={paint.id} value={paint.id}>
            {formatPaintLabel(paint)}
          </option>
        ))}
      </select>
    </label>
  );
}

interface PaintListItemProps {
  paint: Paint;
  onEdit: () => void;
  onDelete: () => void;
}

export function PaintListItem({ paint, onEdit, onDelete }: PaintListItemProps) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-xl border border-border shadow-sm"
          style={{ backgroundColor: paint.hex }}
          aria-hidden
        />
        <div>
          <p className="font-medium text-text">{formatPaintLabel(paint)}</p>
          <p className="text-sm text-muted">{paint.hex}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}

export function PaintSwatchBadge({ paint }: { paint: Paint | null }) {
  if (!paint) {
    return <Badge variant="amber">Not set</Badge>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-4 w-4 rounded-full border border-border"
        style={{ backgroundColor: paint.hex }}
        aria-hidden
      />
      <Badge>{formatPaintLabel(paint)}</Badge>
    </span>
  );
}
