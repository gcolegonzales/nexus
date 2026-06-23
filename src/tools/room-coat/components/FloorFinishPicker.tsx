"use client";

import {
  defaultVariantIdForType,
  FLOOR_FINISH_CATALOG,
  findFloorFinishDefinition,
  resolveFloorFinishVariant,
  type FloorFinishType,
} from "@/tools/room-coat/lib/floor-finishes";
import { Select } from "@nexus/ui";

function FinishSwatch({ hex }: { hex: string }) {
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-md border border-border shadow-sm"
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  );
}

interface FloorFinishPickerProps {
  finishType: FloorFinishType | null;
  variantId: string | null;
  onChange: (
    finishType: FloorFinishType | null,
    variantId: string | null,
  ) => void;
  typeLabel?: string;
  variantLabel?: string;
  allowUnsetType?: boolean;
  typeUnsetLabel?: string;
  className?: string;
}

export function FloorFinishPicker({
  finishType,
  variantId,
  onChange,
  typeLabel = "Floor type",
  variantLabel = "Color / style",
  allowUnsetType = false,
  typeUnsetLabel = "Unit default",
  className,
}: FloorFinishPickerProps) {
  const resolvedType = finishType ?? null;
  const definition = resolvedType
    ? findFloorFinishDefinition(resolvedType)
    : null;
  const resolvedVariant = resolvedType
    ? resolveFloorFinishVariant(resolvedType, variantId)
    : null;

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      <Select
        label={typeLabel}
        allowUnset={allowUnsetType}
        unsetLabel={typeUnsetLabel}
        value={resolvedType}
        fullWidth
        onChange={(nextType) => {
          if (!nextType) {
            onChange(null, null);
            return;
          }
          const type = nextType as FloorFinishType;
          onChange(type, defaultVariantIdForType(type));
        }}
        options={FLOOR_FINISH_CATALOG.map((entry) => ({
          value: entry.type,
          label: entry.label,
          leading: (
            <FinishSwatch hex={resolveFloorFinishVariant(entry.type, null).hex} />
          ),
        }))}
      />
      <Select
        label={variantLabel}
        allowUnset={false}
        value={resolvedVariant?.id ?? null}
        fullWidth
        disabled={!definition}
        onChange={(nextVariantId) => {
          if (!resolvedType || !nextVariantId) return;
          onChange(resolvedType, nextVariantId);
        }}
        options={
          definition?.variants.map((variant) => ({
            value: variant.id,
            label: variant.label,
            leading: <FinishSwatch hex={variant.hex} />,
          })) ?? []
        }
      />
    </div>
  );
}
