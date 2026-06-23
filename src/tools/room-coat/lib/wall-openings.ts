import {
  roomVertices,
  roomWallSegments,
  type RoomWallSegment,
} from "@/tools/room-coat/lib/room-shape";
import { doorHorizontalSpan } from "@/tools/room-coat/lib/door-placement";
import type { Door, PlacedRoom, WallOpening, Window } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export interface WallEdge {
  wallIndex: number;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  lengthMm: number;
  outwardNormalX: number;
  outwardNormalZ: number;
}

export function wallEdges(room: PlacedRoom): WallEdge[] {
  return roomWallSegments(room);
}

export function wallSegmentByIndex(
  room: PlacedRoom,
  wallIndex: number,
): RoomWallSegment | undefined {
  return roomWallSegments(room).find((segment) => segment.wallIndex === wallIndex);
}

export function openingsForWall(
  room: PlacedRoom,
  wallIndex: number,
): WallOpening[] {
  return room.wallOpenings.filter((opening) => opening.wallIndex === wallIndex);
}

export function offsetInOpening(
  room: PlacedRoom,
  wallIndex: number,
  offsetMm: number,
  marginMm = 40,
): boolean {
  return openingsForWall(room, wallIndex).some((opening) => {
    const lo = Math.min(opening.startMm, opening.endMm) - marginMm;
    const hi = Math.max(opening.startMm, opening.endMm) + marginMm;
    return offsetMm >= lo && offsetMm <= hi;
  });
}

export function doorsForWall(room: PlacedRoom, wallIndex: number): Door[] {
  return room.doors.filter((door) => door.wallIndex === wallIndex);
}

export function windowsForWall(room: PlacedRoom, wallIndex: number): Window[] {
  return (room.windows ?? []).filter((window) => window.wallIndex === wallIndex);
}

export interface WallStructurePart {
  startMm: number;
  endMm: number;
  bottomMm: number;
  topMm: number;
  lengthMm: number;
}

function mergeIntervals(
  intervals: Array<{ startMm: number; endMm: number }>,
): Array<{ startMm: number; endMm: number }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals]
    .map((interval) => ({
      startMm: Math.min(interval.startMm, interval.endMm),
      endMm: Math.max(interval.startMm, interval.endMm),
    }))
    .sort((a, b) => a.startMm - b.startMm);
  const merged: Array<{ startMm: number; endMm: number }> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const next = sorted[i];
    if (next.startMm <= last.endMm + 1) {
      last.endMm = Math.max(last.endMm, next.endMm);
    } else {
      merged.push({ ...next });
    }
  }
  return merged;
}

function offsetInsideInterval(
  offsetMm: number,
  intervals: Array<{ startMm: number; endMm: number }>,
): boolean {
  return intervals.some(
    (interval) => offsetMm >= interval.startMm && offsetMm <= interval.endMm,
  );
}

const MIN_WALL_PART_MM = 1;
const MIN_OPENING_GAP_MM = 50;

function doorCoveringSegment(
  room: PlacedRoom,
  wallIndex: number,
  wallLengthMm: number,
  startMm: number,
  endMm: number,
): Door | null {
  const mid = (startMm + endMm) / 2;
  return (
    doorsForWall(room, wallIndex).find((door) => {
      const span = doorHorizontalSpan(door, wallLengthMm);
      if (span.endMm - span.startMm < MIN_WALL_PART_MM) return false;
      return mid >= span.startMm && mid <= span.endMm;
    }) ?? null
  );
}

function segmentInsideDoorOpening(
  startMm: number,
  endMm: number,
  door: Door,
  wallLengthMm: number,
): boolean {
  const span = doorHorizontalSpan(door, wallLengthMm);
  return startMm >= span.startMm - 0.5 && endMm <= span.endMm + 0.5;
}

export interface WallSolidSpan {
  startMm: number;
  endMm: number;
  lengthMm: number;
  doors: Door[];
  windows: Window[];
}

/** Horizontal wall spans split only at full-height openings — not at door jambs. */
export function wallSolidSpans(
  room: PlacedRoom,
  wallIndex: number,
): WallSolidSpan[] {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return [];

  const fullOpenings = openingsForWall(room, wallIndex)
    .map((opening) => ({
      startMm: Math.max(0, Math.min(opening.startMm, opening.endMm)),
      endMm: Math.min(edge.lengthMm, Math.max(opening.startMm, opening.endMm)),
    }))
    .filter((opening) => opening.endMm - opening.startMm > MIN_OPENING_GAP_MM);

  const breakpoints = new Set<number>([0, edge.lengthMm]);
  for (const opening of fullOpenings) {
    breakpoints.add(opening.startMm);
    breakpoints.add(opening.endMm);
  }

  const sorted = [...breakpoints].sort((a, b) => a - b);
  const spans: WallSolidSpan[] = [];
  const wallDoors = doorsForWall(room, wallIndex);
  const wallWindows = windowsForWall(room, wallIndex);

  for (let i = 0; i < sorted.length - 1; i++) {
    const startMm = sorted[i];
    const endMm = sorted[i + 1];
    const lengthMm = endMm - startMm;
    if (lengthMm < MIN_WALL_PART_MM) continue;

    const mid = (startMm + endMm) / 2;
    if (offsetInsideInterval(mid, fullOpenings)) continue;

    const doors = wallDoors.filter((door) => {
      const span = doorHorizontalSpan(door, edge.lengthMm);
      return span.endMm > startMm + 0.5 && span.startMm < endMm - 0.5;
    });
    const windows = wallWindows.filter((window) => {
      const start = window.offsetFromCornerMm;
      const end = window.offsetFromCornerMm + window.widthMm;
      return end > startMm + 0.5 && start < endMm - 0.5;
    });

    spans.push({ startMm, endMm, lengthMm, doors, windows });
  }

  if (spans.length === 0 && fullOpenings.length === 0) {
    spans.push({
      startMm: 0,
      endMm: edge.lengthMm,
      lengthMm: edge.lengthMm,
      doors: wallDoors,
      windows: wallWindows,
    });
  }

  return spans;
}

/** Wall mesh pieces with vertical bounds — used for baseboards and legacy paths. */
export function wallStructureParts(
  room: PlacedRoom,
  wallIndex: number,
): WallStructurePart[] {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return [];

  const roomHeightMm = room.heightMm;
  const fullOpenings = openingsForWall(room, wallIndex)
    .map((opening) => ({
      startMm: Math.max(0, Math.min(opening.startMm, opening.endMm)),
      endMm: Math.min(edge.lengthMm, Math.max(opening.startMm, opening.endMm)),
    }))
    .filter((opening) => opening.endMm - opening.startMm > MIN_OPENING_GAP_MM);

  const breakpoints = new Set<number>([0, edge.lengthMm]);
  for (const opening of fullOpenings) {
    breakpoints.add(opening.startMm);
    breakpoints.add(opening.endMm);
  }
  for (const door of doorsForWall(room, wallIndex)) {
    const span = doorHorizontalSpan(door, edge.lengthMm);
    breakpoints.add(span.startMm);
    breakpoints.add(span.endMm);
  }

  const sorted = [...breakpoints].sort((a, b) => a - b);
  const parts: WallStructurePart[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const startMm = sorted[i];
    const endMm = sorted[i + 1];
    const lengthMm = endMm - startMm;
    if (lengthMm < MIN_WALL_PART_MM) continue;

    const mid = (startMm + endMm) / 2;
    if (offsetInsideInterval(mid, fullOpenings)) continue;

    const door = doorCoveringSegment(room, wallIndex, edge.lengthMm, startMm, endMm);
    if (door && segmentInsideDoorOpening(startMm, endMm, door, edge.lengthMm)) {
      if (door.heightMm < roomHeightMm - MIN_OPENING_GAP_MM) {
        parts.push({
          startMm,
          endMm,
          bottomMm: door.heightMm,
          topMm: roomHeightMm,
          lengthMm,
        });
      }
      continue;
    }

    parts.push({
      startMm,
      endMm,
      bottomMm: 0,
      topMm: roomHeightMm,
      lengthMm,
    });
  }

  if (parts.length === 0 && fullOpenings.length === 0 && doorsForWall(room, wallIndex).length === 0) {
    parts.push({
      startMm: 0,
      endMm: edge.lengthMm,
      bottomMm: 0,
      topMm: roomHeightMm,
      lengthMm: edge.lengthMm,
    });
  }

  return parts;
}

export function solidWallSegments(
  room: PlacedRoom,
  wallIndex: number,
): Array<{ startMm: number; endMm: number; lengthMm: number }> {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return [];

  const openings = mergeIntervals(
    openingsForWall(room, wallIndex).map((opening) => ({
      startMm: Math.max(0, Math.min(opening.startMm, opening.endMm)),
      endMm: Math.min(edge.lengthMm, Math.max(opening.startMm, opening.endMm)),
    })),
  ).filter((opening) => opening.endMm - opening.startMm > MIN_OPENING_GAP_MM);

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
  wallIndex: number,
  startMm: number,
  endMm: number,
): { x: number; z: number } {
  const edge = wallSegmentByIndex(room, wallIndex)!;
  const t = (startMm + endMm) / 2 / edge.lengthMm;
  return {
    x: edge.x1 + (edge.x2 - edge.x1) * t,
    z: edge.z1 + (edge.z2 - edge.z1) * t,
  };
}

export function projectPointToWall(
  room: PlacedRoom,
  wallIndex: number,
  x: number,
  z: number,
): { offsetMm: number; x: number; z: number; distanceMm: number } | null {
  const edge = wallSegmentByIndex(room, wallIndex);
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

export function snapToNearestWall(
  rooms: PlacedRoom[],
  x: number,
  z: number,
): { x: number; z: number; room: PlacedRoom; wallIndex: number } | null {
  let best: {
    x: number;
    z: number;
    room: PlacedRoom;
    wallIndex: number;
    distanceMm: number;
  } | null = null;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const projected = projectPointToWall(room, edge.wallIndex, x, z);
      if (!projected) continue;
      if (projected.distanceMm > SNAP_MM) continue;
      if (!best || projected.distanceMm < best.distanceMm) {
        best = {
          x: projected.x,
          z: projected.z,
          room,
          wallIndex: edge.wallIndex,
          distanceMm: projected.distanceMm,
        };
      }
    }
  }

  return best
    ? { x: best.x, z: best.z, room: best.room, wallIndex: best.wallIndex }
    : null;
}

export function offsetToWorldOnWall(
  room: PlacedRoom,
  wallIndex: number,
  offsetMm: number,
): { x: number; z: number } {
  const edge = wallSegmentByIndex(room, wallIndex)!;
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
): { wallIndex: number; offsetMm: number } | null {
  let best: { wallIndex: number; offsetMm: number; distanceMm: number } | null =
    null;

  for (const edge of wallEdges(room)) {
    const projected = projectPointToWall(room, edge.wallIndex, x, z);
    if (!projected || projected.distanceMm > 350) continue;
    if (!best || projected.distanceMm < best.distanceMm) {
      best = {
        wallIndex: edge.wallIndex,
        offsetMm: projected.offsetMm,
        distanceMm: projected.distanceMm,
      };
    }
  }

  return best ? { wallIndex: best.wallIndex, offsetMm: best.offsetMm } : null;
}

export interface WallHit {
  room: PlacedRoom;
  wallIndex: number;
  x: number;
  z: number;
  offsetMm: number;
}

export function findWallHit(
  rooms: PlacedRoom[],
  x: number,
  z: number,
  maxDistanceMm = 280,
): WallHit | null {
  let best: WallHit & { distanceMm: number } | null = null;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const projected = projectPointToWall(room, edge.wallIndex, x, z);
      if (!projected || projected.distanceMm > maxDistanceMm) continue;
      if (!best || projected.distanceMm < best.distanceMm) {
        best = {
          room,
          wallIndex: edge.wallIndex,
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
        wallIndex: best.wallIndex,
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

export { roomVertices };

export const MM_TO_M_CONST = MM_TO_M;
