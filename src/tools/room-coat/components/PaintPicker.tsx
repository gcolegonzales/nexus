"use client";

import type { Paint } from "@/tools/room-coat/types/state";
import { formatPaintLabel } from "@/tools/room-coat/lib/resolve-paint";
import { Badge, Card, Select } from "@nexus/ui";
import { Button } from "@nexus/next";

function PaintSwatch({
  hex,
  size = "md",
}: {
  hex: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "h-10 w-10 rounded-xl"
      : size === "md"
        ? "h-5 w-5 rounded-md"
        : "h-4 w-4 rounded-full";
  return (
    <span
      className={`${sizeClass} shrink-0 border border-border shadow-sm`}
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  );
}

interface PaintPickerProps {
  paints: Paint[];
  value: string | null;
  onChange: (paintId: string | null) => void;
  allowUnset?: boolean;
  label?: string;
  fullWidth?: boolean;
  className?: string;
}

export function PaintPicker({
  paints,
  value,
  onChange,
  allowUnset = true,
  label = "Paint",
  fullWidth = false,
  className,
}: PaintPickerProps) {
  return (
    <Select
      label={label}
      allowUnset={allowUnset}
      unsetLabel="Not set"
      value={value}
      onChange={onChange}
      fullWidth={fullWidth}
      className={className}
      options={paints.map((paint) => ({
        value: paint.id,
        label: formatPaintLabel(paint),
        leading: <PaintSwatch hex={paint.hex} />,
      }))}
    />
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
        <PaintSwatch hex={paint.hex} size="lg" />
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
      <PaintSwatch hex={paint.hex} />
      <Badge>{formatPaintLabel(paint)}</Badge>
    </span>
  );
}
