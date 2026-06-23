import { floorGridCellSizeM } from "@/tools/room-coat/lib/units";
import { VERTEX_SNAP_RADIUS_MM } from "@/tools/room-coat/lib/room-shape";
import type { Room, RoomVertex, UnitPreference } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;
export const MIN_ROOM_SIZE_MM = 600;

export interface RoomDrawRect {
  originXMm: number;
  originZMm: number;
  widthMm: number;
  lengthMm: number;
}

export function gridStepMm(unit: UnitPreference): number {
  return Math.round(floorGridCellSizeM(unit) / MM_TO_M);
}

export function snapCoordToGrid(mm: number, unit: UnitPreference): number {
  const step = gridStepMm(unit);
  return Math.round(mm / step) * step;
}

export function defaultNewRoomName(rooms: Room[]): string {
  let index = rooms.length + 1;
  while (rooms.some((room) => room.name === `Room ${index}`)) {
    index += 1;
  }
  return `Room ${index}`;
}

/** Build a center-anchored room rect from two drag corners. */
export function roomRectFromDrag(
  startXMm: number,
  startZMm: number,
  endXMm: number,
  endZMm: number,
  unit: UnitPreference,
  snap = true,
): RoomDrawRect | null {
  const x1 = snap ? snapCoordToGrid(startXMm, unit) : Math.round(startXMm);
  const z1 = snap ? snapCoordToGrid(startZMm, unit) : Math.round(startZMm);
  const x2 = snap ? snapCoordToGrid(endXMm, unit) : Math.round(endXMm);
  const z2 = snap ? snapCoordToGrid(endZMm, unit) : Math.round(endZMm);

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);

  const widthMm = maxX - minX;
  const lengthMm = maxZ - minZ;

  if (widthMm < MIN_ROOM_SIZE_MM || lengthMm < MIN_ROOM_SIZE_MM) {
    return null;
  }

  return {
    originXMm: (minX + maxX) / 2,
    originZMm: (minZ + maxZ) / 2,
    widthMm,
    lengthMm,
  };
}

export function canClosePolygon(
  vertices: RoomVertex[],
  cursor: RoomVertex,
  closeRadiusMm = VERTEX_SNAP_RADIUS_MM,
): boolean {
  if (vertices.length < 3) return false;
  const first = vertices[0];
  return (
    Math.hypot(cursor.xMm - first.xMm, cursor.zMm - first.zMm) <= closeRadiusMm
  );
}
