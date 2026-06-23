import { boundsFromVertices, roomVertices } from "@/tools/room-coat/lib/room-shape";
import type { Furnishing, PlacedRoom } from "@/tools/room-coat/types/state";

export interface OrientedRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  widthMm: number;
  depthMm: number;
}

/** Axis-aligned bounds from the room polygon (or catalog W/L fallback). */
export function roomRect(room: PlacedRoom): OrientedRect {
  const bounds = boundsFromVertices(roomVertices(room));
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
    centerX: bounds.centerXMm,
    centerZ: bounds.centerZMm,
    widthMm: bounds.widthMm,
    depthMm: bounds.lengthMm,
  };
}

export function furnishingRect(item: Furnishing): OrientedRect {
  const swap = item.rotationDeg === 90 || item.rotationDeg === 270;
  const widthMm = swap ? item.depthMm : item.widthMm;
  const depthMm = swap ? item.widthMm : item.depthMm;
  const halfW = widthMm / 2;
  const halfD = depthMm / 2;
  return {
    minX: item.centerXMm - halfW,
    maxX: item.centerXMm + halfW,
    minZ: item.centerZMm - halfD,
    maxZ: item.centerZMm + halfD,
    centerX: item.centerXMm,
    centerZ: item.centerZMm,
    widthMm,
    depthMm,
  };
}

export function floorBoundsFromRooms(rooms: PlacedRoom[]): OrientedRect | null {
  if (rooms.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const room of rooms) {
    const rect = roomRect(room);
    minX = Math.min(minX, rect.minX);
    maxX = Math.max(maxX, rect.maxX);
    minZ = Math.min(minZ, rect.minZ);
    maxZ = Math.max(maxZ, rect.maxZ);
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    widthMm: maxX - minX,
    depthMm: maxZ - minZ,
  };
}

export function gapBetweenRects(a: OrientedRect, b: OrientedRect): number {
  const gapX =
    a.maxX < b.minX
      ? b.minX - a.maxX
      : b.maxX < a.minX
        ? a.minX - b.maxX
        : 0;
  const gapZ =
    a.maxZ < b.minZ
      ? b.minZ - a.maxZ
      : b.maxZ < a.minZ
        ? a.minZ - b.maxZ
        : 0;
  if (gapX > 0 && gapZ > 0) return Math.hypot(gapX, gapZ);
  return Math.max(gapX, gapZ);
}

export function rectsOverlap(a: OrientedRect, b: OrientedRect, paddingMm = 0): boolean {
  return !(
    a.maxX + paddingMm <= b.minX ||
    a.minX - paddingMm >= b.maxX ||
    a.maxZ + paddingMm <= b.minZ ||
    a.minZ - paddingMm >= b.maxZ
  );
}
