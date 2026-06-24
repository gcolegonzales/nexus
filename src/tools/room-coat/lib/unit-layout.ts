import type { Hallway, PlacedRoom, WallSide } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export interface HallwayLayout {
  centerXMm: number;
  centerZMm: number;
  lengthMm: number;
  widthMm: number;
  rotationY: number;
}

export function wallCenter(
  room: PlacedRoom,
  wall: WallSide,
): { x: number; z: number } {
  const hw = room.widthMm / 2;
  const hl = room.lengthMm / 2;
  switch (wall) {
    case "north":
      return { x: room.originXMm, z: room.originZMm - hl };
    case "south":
      return { x: room.originXMm, z: room.originZMm + hl };
    case "west":
      return { x: room.originXMm - hw, z: room.originZMm };
    case "east":
      return { x: room.originXMm + hw, z: room.originZMm };
  }
}

export function computeHallwayLayout(
  roomA: PlacedRoom,
  wallA: WallSide,
  roomB: PlacedRoom,
  wallB: WallSide,
  widthMm: number,
): HallwayLayout | null {
  const a = wallCenter(roomA, wallA);
  const b = wallCenter(roomB, wallB);

  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const distance = Math.hypot(dx, dz);

  if (distance < 100) return null;

  const rotationY = Math.atan2(dx, dz);
  return {
    centerXMm: (a.x + b.x) / 2,
    centerZMm: (a.z + b.z) / 2,
    lengthMm: distance,
    widthMm,
    rotationY,
  };
}

export function layoutToM(layout: HallwayLayout) {
  return {
    centerX: layout.centerXMm * MM_TO_M,
    centerZ: layout.centerZMm * MM_TO_M,
    length: layout.lengthMm * MM_TO_M,
    width: layout.widthMm * MM_TO_M,
    rotationY: layout.rotationY,
  };
}

export function unitBounds(rooms: PlacedRoom[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  if (rooms.length === 0) {
    return { minX: -3000, maxX: 3000, minZ: -3000, maxZ: 3000 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const room of rooms) {
    // Use the real polygon vertices so bounds stay correct for non-rectangular
    // rooms and after any resize that leaves widthMm/lengthMm stale. Fall back
    // to origin +/- half-size only when a placement has no vertices.
    if (room.verticesMm && room.verticesMm.length > 0) {
      for (const vertex of room.verticesMm) {
        minX = Math.min(minX, vertex.xMm);
        maxX = Math.max(maxX, vertex.xMm);
        minZ = Math.min(minZ, vertex.zMm);
        maxZ = Math.max(maxZ, vertex.zMm);
      }
    } else {
      minX = Math.min(minX, room.originXMm - room.widthMm / 2);
      maxX = Math.max(maxX, room.originXMm + room.widthMm / 2);
      minZ = Math.min(minZ, room.originZMm - room.lengthMm / 2);
      maxZ = Math.max(maxZ, room.originZMm + room.lengthMm / 2);
    }
  }

  return { minX, maxX, minZ, maxZ };
}

export function oppositeWall(wall: WallSide): WallSide {
  switch (wall) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "east":
      return "west";
    case "west":
      return "east";
  }
}
