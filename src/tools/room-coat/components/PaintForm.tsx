"use client";

import type { Paint } from "@/tools/room-coat/types/state";
import { Input } from "@nexus/ui";
import { FormActions } from "@nexus/next";

interface PaintFormProps {
  paint: Paint;
  onChange: (paint: Paint) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}

export function PaintForm({
  paint,
  onChange,
  onSave,
  onCancel,
  saveLabel = "Save paint",
}: PaintFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-text">Swatch</label>
        <input
          type="color"
          value={paint.hex}
          onChange={(event) => onChange({ ...paint, hex: event.target.value })}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface"
          aria-label="Paint color swatch"
        />
        <input
          type="text"
          value={paint.hex}
          onChange={(event) => onChange({ ...paint, hex: event.target.value })}
          className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-label="Hex color"
        />
      </div>

      <Input
        label="Paint code"
        value={paint.code}
        onChange={(event) => onChange({ ...paint, code: event.target.value })}
        placeholder="7008"
        required
      />
      <Input
        label="Brand (optional)"
        value={paint.brand ?? ""}
        onChange={(event) =>
          onChange({ ...paint, brand: event.target.value || undefined })
        }
        placeholder="Sherwin-Williams"
      />
      <Input
        label="Name (optional)"
        value={paint.name ?? ""}
        onChange={(event) =>
          onChange({ ...paint, name: event.target.value || undefined })
        }
        placeholder="Alabaster"
      />

      <FormActions onSave={onSave} onCancel={onCancel} saveLabel={saveLabel} />
    </div>
  );
}
