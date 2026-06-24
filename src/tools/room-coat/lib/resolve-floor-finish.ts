import {
  DEFAULT_FLOOR_FINISH_TYPE,
  defaultVariantIdForType,
  findFloorFinishDefinition,
  formatFloorFinishLabel,
  resolveFloorFinishVariant,
  type FloorFinishProductInfo,
  type FloorFinishTextureKind,
  type FloorFinishType,
} from "@/tools/room-coat/lib/floor-finishes";
import { parseFloorFinishOverride } from "@/tools/room-coat/lib/floor-finish-override";
import type { RoomCoat } from "@/tools/room-coat/types/state";

export type FloorFinishSource =
  | "override"
  | "coat"
  | "unit-default"
  | "default";

export interface ResolvedFloorFinish {
  type: FloorFinishType;
  variantId: string;
  label: string;
  hex: string;
  textureKind: FloorFinishTextureKind;
  roughness: number;
  cellSizeM: number;
  planksPerTile?: number;
  plankWidthM?: number;
  plankLengthM?: number;
  productInfo: FloorFinishProductInfo;
  source: FloorFinishSource;
}

interface FloorFinishSpace {
  coat: RoomCoat;
  surfaceOverrides: Record<string, string>;
}

function resolveTypeAndVariant(
  coat: RoomCoat,
): { type: FloorFinishType; variantId: string | null } {
  return {
    type: coat.floorFinishType ?? DEFAULT_FLOOR_FINISH_TYPE,
    variantId: coat.floorFinishVariantId,
  };
}

export function resolveFloorFinishForSpace(
  space: FloorFinishSpace,
  surfaceId: string,
  unitDefaultCoat?: RoomCoat,
): ResolvedFloorFinish {
  const overrideValue = space.surfaceOverrides[surfaceId];
  const parsedOverride = overrideValue
    ? parseFloorFinishOverride(overrideValue)
    : null;

  if (parsedOverride) {
    return buildResolved(
      parsedOverride.type,
      parsedOverride.variantId,
      "override",
    );
  }

  if (space.coat.floorFinishType !== null) {
    return buildResolved(
      space.coat.floorFinishType,
      space.coat.floorFinishVariantId,
      "coat",
    );
  }

  if (unitDefaultCoat?.floorFinishType) {
    return buildResolved(
      unitDefaultCoat.floorFinishType,
      unitDefaultCoat.floorFinishVariantId,
      "unit-default",
    );
  }

  const fallback = resolveTypeAndVariant(unitDefaultCoat ?? space.coat);
  return buildResolved(
    fallback.type,
    fallback.variantId,
    // Only attribute the finish to the unit default when the unit default coat
    // actually specifies one; otherwise this is a generic default.
    unitDefaultCoat?.floorFinishType ? "unit-default" : "default",
  );
}

function buildResolved(
  type: FloorFinishType,
  variantId: string | null,
  source: FloorFinishSource,
): ResolvedFloorFinish {
  const definition = findFloorFinishDefinition(type);
  const variant = resolveFloorFinishVariant(type, variantId);
  const resolvedVariantId = variant.id || defaultVariantIdForType(type);

  return {
    type,
    variantId: resolvedVariantId,
    label: formatFloorFinishLabel(type, resolvedVariantId),
    hex: variant.hex,
    textureKind: definition.textureKind,
    roughness: definition.roughness,
    cellSizeM: definition.cellSizeM,
    planksPerTile: definition.planksPerTile,
    plankWidthM: definition.plankWidthM,
    plankLengthM: definition.plankLengthM,
    productInfo: definition.productInfo,
    source,
  };
}

export function floorFinishSourceLabel(source: FloorFinishSource): string {
  switch (source) {
    case "override":
      return "Override";
    case "coat":
      return "Room default";
    case "unit-default":
      return "Unit default";
    case "default":
      return "Default";
  }
}
