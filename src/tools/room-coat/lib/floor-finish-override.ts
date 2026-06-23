import {
  isFloorFinishType,
  type FloorFinishType,
} from "@/tools/room-coat/lib/floor-finishes";

export const FLOOR_FINISH_OVERRIDE_PREFIX = "floor:";

export function encodeFloorFinishOverride(
  type: FloorFinishType,
  variantId: string,
): string {
  return `${FLOOR_FINISH_OVERRIDE_PREFIX}${type}:${variantId}`;
}

export function isFloorFinishOverride(value: string): boolean {
  return value.startsWith(FLOOR_FINISH_OVERRIDE_PREFIX);
}

export function parseFloorFinishOverride(
  value: string,
): { type: FloorFinishType; variantId: string } | null {
  if (!isFloorFinishOverride(value)) return null;
  const payload = value.slice(FLOOR_FINISH_OVERRIDE_PREFIX.length);
  const separator = payload.indexOf(":");
  if (separator <= 0) return null;
  const type = payload.slice(0, separator);
  const variantId = payload.slice(separator + 1);
  if (!isFloorFinishType(type) || !variantId) return null;
  return { type, variantId };
}

export function isPaintSurfaceOverride(value: string | undefined): boolean {
  return Boolean(value && !isFloorFinishOverride(value));
}
