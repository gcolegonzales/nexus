import type { PlacedRoom, WallOpening, WallSide } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export interface WallEdge {
  wall: WallSide;
  /** World coordinates of edge start (min corner along wall). */
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  lengthMm: number;
}

export function wallEdges(room: PlacedRoom): WallEdge[] {
  const hw = room.widthMm / 2;
  const hl = room.lengthMm / 2;
  const cx = room.originXMm;
  const cz = room.originZMm;

  return [
    {
      wall: "north",
      x1: cx - hw,
      z1: cz - hl,
      x2: cx + hw,
      z2: cz - hl,
      lengthMm: room.widthMm,
    },
    {
      wall: "south",
      x1: cx - hw,
      z1: cz + hl,
      x2: cx + hw,
      z2: cz + hl,
      lengthMm: room.widthMm,
    },
    {
      wall: "west",
      x1: cx - hw,
      z1: cz - hl,
      x2: cx - hw,
      z2: cz + hl,
      lengthMm: room.lengthMm,
    },
    {
      wall: "east",
      x1: cx + hw,
      z1: cz - hl,
      x2: cx + hw,
      z2: cz + hl,
      lengthMm: room.lengthMm,
    },
  ];
}

export function openingsForWall(
  room: PlacedRoom,
  wall: WallSide,
): WallOpening[] {
  return room.wallOpenings.filter((opening) => opening.wall === wall);
}

/** True when offset falls inside an existing opening on this wall. */
export function offsetInOpening(
  room: PlacedRoom,
  wall: WallSide,
  offsetMm: number,
  marginMm = 40,
): boolean {
  return openingsForWall(room, wall).some((opening) => {
    const lo = Math.min(opening.startMm, opening.endMm) - marginMm;
    const hi = Math.max(opening.startMm, opening.endMm) + marginMm;
    return offsetMm >= lo && offsetMm <= hi;
  });
}

/** Solid wall segments remaining after openings (for mesh + paint). */
export function solidWallSegments(
  room: PlacedRoom,
  wall: WallSide,
): Array<{ startMm: number; endMm: number; lengthMm: number }> {
  const edge = wallEdges(room).find((item) => item.wall === wall);
  if (!edge) return [];

  const openings = openingsForWall(room, wall)
    .map((opening) => ({
      startMm: Math.max(0, Math.min(opening.startMm, opening.endMm)),
      endMm: Math.min(edge.lengthMm, Math.max(opening.startMm, opening.endMm)),
    }))
    .filter((opening) => opening.endMm - opening.startMm > 50)
    .sort((a, b) => a.startMm - b.startMm);

  const segments: Array<{ startMm: number; endMm: number; lengthMm: number }> =
    [];
  let cursor = 0;

  for (const opening of openings) {
    if (opening.startMm > cursor + 50) {
      segments.push({
        startMm: cursor,
        endMm: opening.startMm,
        lengthMm: opening.startMm - cursor,
      });
    }
    cursor = Math.max(cursor, opening.endMm);
  }

  if (edge.lengthMm > cursor + 50) {
    segments.push({
      startMm: cursor,
      endMm: edge.lengthMm,
      lengthMm: edge.lengthMm - cursor,
    });
  }

  if (segments.length === 0 && openings.length === 0) {
    segments.push({ startMm: 0, endMm: edge.lengthMm, lengthMm: edge.lengthMm });
  }

  return segments;
}

export function wallSegmentCenter(
  room: PlacedRoom,
  wall: WallSide,
  startMm: number,
  endMm: number,
): { x: number; z: number } {
  const edge = wallEdges(room).find((item) => item.wall === wall)!;
  const t = (startMm + endMm) / 2 / edge.lengthMm;
  return {
    x: edge.x1 + (edge.x2 - edge.x1) * t,
    z: edge.z1 + (edge.z2 - edge.z1) * t,
  };
}

export function projectPointToWall(
  room: PlacedRoom,
  wall: WallSide,
  x: number,
  z: number,
): { offsetMm: number; x: number; z: number; distanceMm: number } | null {
  const edge = wallEdges(room).find((item) => item.wall === wall);
  if (!edge) return null;

  const dx = edge.x2 - edge.x1;
  const dz = edge.z2 - edge.z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return null;

  const t = Math.max(
    0,
    Math.min(1, ((x - edge.x1) * dx + (z - edge.z1) * dz) / lenSq),
  );
  const px = edge.x1 + dx * t;
  const pz = edge.z1 + dz * t;
  const offsetMm = t * edge.lengthMm;
  const distanceMm = Math.hypot(x - px, z - pz);

  return { offsetMm, x: px, z: pz, distanceMm };
}

const SNAP_MM = 400;

/** Snap a world point to the nearest wall edge on any placed room. */
export function snapToNearestWall(
  rooms: PlacedRoom[],
  x: number,
  z: number,
): { x: number; z: number; room: PlacedRoom; wall: WallSide } | null {
  let best: {
    x: number;
    z: number;
    room: PlacedRoom;
    wall: WallSide;
    distanceMm: number;
  } | null = null;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const projected = projectPointToWall(room, edge.wall, x, z);
      if (!projected) continue;
      if (projected.distanceMm > SNAP_MM) continue;
      if (!best || projected.distanceMm < best.distanceMm) {
        best = {
          x: projected.x,
          z: projected.z,
          room,
          wall: edge.wall,
          distanceMm: projected.distanceMm,
        };
      }
    }
  }

  return best
    ? { x: best.x, z: best.z, room: best.room, wall: best.wall }
    : null;
}

export function offsetToWorldOnWall(
  room: PlacedRoom,
  wall: WallSide,
  offsetMm: number,
): { x: number; z: number } {
  const edge = wallEdges(room).find((item) => item.wall === wall)!;
  const t = offsetMm / edge.lengthMm;
  return {
    x: edge.x1 + (edge.x2 - edge.x1) * t,
    z: edge.z1 + (edge.z2 - edge.z1) * t,
  };
}

export function pickWallAtPoint(
  room: PlacedRoom,
  x: number,
  z: number,
): { wall: WallSide; offsetMm: number } | null {
  let best: { wall: WallSide; offsetMm: number; distanceMm: number } | null =
    null;

  for (const edge of wallEdges(room)) {
    const projected = projectPointToWall(room, edge.wall, x, z);
    if (!projected || projected.distanceMm > 350) continue;
    if (!best || projected.distanceMm < best.distanceMm) {
      best = {
        wall: edge.wall,
        offsetMm: projected.offsetMm,
        distanceMm: projected.distanceMm,
      };
    }
  }

  return best ? { wall: best.wall, offsetMm: best.offsetMm } : null;
}

export interface WallHit {
  room: PlacedRoom;
  wall: WallSide;
  x: number;
  z: number;
  offsetMm: number;
}

/** Nearest wall edge under the cursor — for hallway placement and hover preview. */
export function findWallHit(
  rooms: PlacedRoom[],
  x: number,
  z: number,
  maxDistanceMm = 280,
): WallHit | null {
  let best: WallHit & { distanceMm: number } | null = null;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const projected = projectPointToWall(room, edge.wall, x, z);
      if (!projected || projected.distanceMm > maxDistanceMm) continue;
      if (!best || projected.distanceMm < best.distanceMm) {
        best = {
          room,
          wall: edge.wall,
          x: projected.x,
          z: projected.z,
          offsetMm: projected.offsetMm,
          distanceMm: projected.distanceMm,
        };
      }
    }
  }

  return best
    ? {
        room: best.room,
        wall: best.wall,
        x: best.x,
        z: best.z,
        offsetMm: best.offsetMm,
      }
    : null;
}

export function hallwaySegmentLengthMm(
  a: { xMm: number; zMm: number },
  b: { xMm: number; zMm: number },
): number {
  return Math.hypot(b.xMm - a.xMm, b.zMm - a.zMm);
}

export function totalHallwayLengthMm(
  waypoints: Array<{ xMm: number; zMm: number }>,
): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += hallwaySegmentLengthMm(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

export const MM_TO_M_CONST = MM_TO_M;
