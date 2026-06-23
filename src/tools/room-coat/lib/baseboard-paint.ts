import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import type { Hallway, PlacedRoom } from "@/tools/room-coat/types/state";

/** Room or hallway id scope for a unified baseboard paint. */
export function baseboardPaintScopeId(surfaceId: string): string | null {
  const roomMatch = surfaceId.match(/^([^:]+):baseboard:/);
  if (roomMatch) return `room:${roomMatch[1]}`;

  const hallwayMatch = surfaceId.match(/^([^:]+):seg:\d+:baseboard:/);
  if (hallwayMatch) return `hall:${hallwayMatch[1]}`;

  return null;
}

export function baseboardsSharePaintScope(
  selectedSurfaceId: string | null,
  surfaceId: string,
): boolean {
  if (!selectedSurfaceId) return false;
  const a = baseboardPaintScopeId(selectedSurfaceId);
  const b = baseboardPaintScopeId(surfaceId);
  return a !== null && a === b;
}

export function baseboardSurfaceIdsForSpace(
  space: PlacedRoom | Hallway,
): string[] {
  const surfaces =
    "placementId" in space
      ? buildSurfacesForPlacedRoom(space)
      : buildSurfacesForHallway(space);
  return surfaces
    .filter((surface) => surface.category === "baseboard")
    .map((surface) => surface.id);
}

export function withoutBaseboardSurfaceOverrides(
  overrides: Record<string, string>,
  space: PlacedRoom | Hallway,
): Record<string, string> {
  const baseboardIds = new Set(baseboardSurfaceIdsForSpace(space));
  return Object.fromEntries(
    Object.entries(overrides).filter(([id]) => !baseboardIds.has(id)),
  );
}
